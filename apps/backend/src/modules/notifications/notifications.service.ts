import { Injectable, Logger } from '@nestjs/common';
import { Expo, ExpoPushMessage, ExpoPushTicket } from 'expo-server-sdk';
import { DatabaseService } from '../../database/database.service';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);
  private expo = new Expo();

  constructor(private readonly db: DatabaseService) {}

  /**
   * Envoie une notification push à un ou plusieurs utilisateurs.
   * Cette fonction sépare les tokens valides des non valides,
   * envoie les requêtes par lots (chunks) via Expo, et log le résultat.
   * 
   * @param userIds Liste des IDs utilisateurs à notifier
   * @param title Titre de la notification
   * @param body Corps du message
   * @param data Données additionnelles (JSON) utiles pour l'appli (ex: redirection)
   */
  async sendPushNotifications(userIds: string[], title: string, body: string, data: any = {}) {
    if (!userIds || userIds.length === 0) return;

    // 1. Récupérer les tokens des utilisateurs ciblés
    const users = await this.db.user.findMany({
      where: {
        id: { in: userIds },
        pushToken: { not: null },
      },
      select: { pushToken: true, id: true },
    });

    const messages: ExpoPushMessage[] = [];

    // 2. Vérifier la validité des tokens
    for (const user of users) {
      if (!Expo.isExpoPushToken(user.pushToken)) {
        this.logger.warn(`Push token invalide pour le user ${user.id}: ${user.pushToken}`);
        continue;
      }
      messages.push({
        to: user.pushToken,
        sound: 'default',
        title,
        body,
        data,
      });
    }

    if (messages.length === 0) {
      this.logger.log('Aucun token valide trouvé pour envoyer la notification.');
      return;
    }

    // 3. Envoyer par lots (chunks) recommandés par Expo
    const chunks = this.expo.chunkPushNotifications(messages);
    const tickets: ExpoPushTicket[] = [];

    for (const chunk of chunks) {
      try {
        const ticketChunk = await this.expo.sendPushNotificationsAsync(chunk);
        tickets.push(...ticketChunk);
        this.logger.log(`Envoi de ${chunk.length} notifications effectué.`);
      } catch (error) {
        this.logger.error('Erreur lors de l\'envoi du lot de notifications', error);
      }
    }

    // NOTE: On ne traite pas ici les reçus (Receipts) pour purger les tokens invalides
    // pour garder ce service simple dans un premier temps. 
    // Idéalement, il faudrait appeler getPushNotificationReceiptsAsync plus tard.
  }

  /**
   * Envoie une notification à TOUS les utilisateurs ayant activé les notifications.
   * Utile pour la communication globale.
   */
  async sendToAll(title: string, body: string, data: any = {}) {
    const allUsers = await this.db.user.findMany({
      where: { pushToken: { not: null } },
      select: { id: true },
    });
    const userIds = allUsers.map((u) => u.id);
    await this.sendPushNotifications(userIds, title, body, data);
  }
}
