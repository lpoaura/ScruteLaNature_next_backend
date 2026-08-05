import { Injectable, Logger } from '@nestjs/common';
import { Expo, ExpoPushMessage, ExpoPushTicket } from 'expo-server-sdk';
import { DatabaseService } from '../../database/database.service';

export interface PushSendResult {
  success: boolean;
  targetCount: number;
  validTokensCount: number;
  sentCount: number;
  errorCount: number;
  errors: Array<{ message: string; details?: any }>;
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);
  private expo = new Expo();

  constructor(private readonly db: DatabaseService) {}

  /**
   * Envoie une notification push à un ou plusieurs utilisateurs.
   * Cette fonction vérifie la validité des tokens, envoie les requêtes via Expo,
   * analyse le statut exact de chaque ticket et retourne un rapport complet.
   */
  async sendPushNotifications(
    userIds: string[],
    title: string,
    body: string,
    data: any = {},
  ): Promise<PushSendResult> {
    const result: PushSendResult = {
      success: false,
      targetCount: userIds?.length || 0,
      validTokensCount: 0,
      sentCount: 0,
      errorCount: 0,
      errors: [],
    };

    if (!userIds || userIds.length === 0) {
      result.errors.push({ message: 'Aucun utilisateur cible spécifié.' });
      return result;
    }

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
      if (!user.pushToken) continue;
      if (!Expo.isExpoPushToken(user.pushToken)) {
        this.logger.warn(`Push token invalide pour le user ${user.id}: "${user.pushToken}"`);
        result.errors.push({
          message: `Token invalide pour le user ${user.id} (format non reconnu par Expo : "${user.pushToken}")`,
        });
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

    result.validTokensCount = messages.length;

    if (messages.length === 0) {
      const msg = "Aucun token push Expo valide (ex: ExponentPushToken[xxx]) n'a été trouvé en base pour les utilisateurs ciblés.";
      this.logger.warn(msg);
      result.errors.push({ message: msg });
      return result;
    }

    // 3. Envoyer par lots (chunks) recommandés par Expo
    const chunks = this.expo.chunkPushNotifications(messages);
    const tickets: ExpoPushTicket[] = [];

    for (const chunk of chunks) {
      try {
        const ticketChunk = await this.expo.sendPushNotificationsAsync(chunk);
        tickets.push(...ticketChunk);
      } catch (error: any) {
        this.logger.error('Erreur réseau/Expo lors de l\'envoi du lot de notifications', error);
        result.errorCount += chunk.length;
        result.errors.push({ message: error?.message || "Erreur réseau lors de l'appel à l'API Expo" });
      }
    }

    // 4. Analyser les tickets de réponse pour vérifier si Expo a accepté ou rejeté les messages
    for (const ticket of tickets) {
      if (ticket.status === 'ok') {
        result.sentCount++;
      } else if (ticket.status === 'error') {
        result.errorCount++;
        const errMsg = ticket.message || "Erreur de transmission Expo";
        this.logger.error(`Notification rejetée par Expo : ${errMsg}`, ticket.details);
        result.errors.push({
          message: errMsg,
          details: ticket.details,
        });
      }
    }

    result.success = result.sentCount > 0 && result.errorCount === 0;
    this.logger.log(`Résultat push : ${result.sentCount} succès, ${result.errorCount} échec(s) sur ${result.validTokensCount} token(s) valide(s).`);
    return result;
  }

  /**
   * Envoie une notification à TOUS les utilisateurs ayant un token enregistré.
   */
  async sendToAll(title: string, body: string, data: any = {}): Promise<PushSendResult> {
    const allUsers = await this.db.user.findMany({
      where: { pushToken: { not: null } },
      select: { id: true },
    });
    if (allUsers.length === 0) {
      const msg = "Aucun utilisateur ayant enregistré un token de notification (pushToken) n'existe en base de données.";
      this.logger.warn(msg);
      return {
        success: false,
        targetCount: 0,
        validTokensCount: 0,
        sentCount: 0,
        errorCount: 1,
        errors: [{ message: msg }],
      };
    }
    const userIds = allUsers.map((u) => u.id);
    return this.sendPushNotifications(userIds, title, body, data);
  }
}
