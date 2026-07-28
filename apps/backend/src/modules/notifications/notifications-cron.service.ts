import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { DatabaseService } from '../../database/database.service';
import { NotificationsService } from './notifications.service';

@Injectable()
export class NotificationsCronService {
  private readonly logger = new Logger(NotificationsCronService.name);

  constructor(
    private readonly db: DatabaseService,
    private readonly notificationsService: NotificationsService,
  ) {}

  // S'exécute tous les jours à midi
  @Cron(CronExpression.EVERY_DAY_AT_NOON)
  async handleInactivityReminders() {
    this.logger.log("Lancement du Cron Job: Rappels d'inactivité...");

    const INACTIVITY_THRESHOLD_DAYS = 15;

    const inactivityDate = new Date();
    inactivityDate.setDate(inactivityDate.getDate() - INACTIVITY_THRESHOLD_DAYS);

    // Trouver les utilisateurs qui:
    // - Ont un push token
    // - Ne se sont pas connectés depuis plus de 15 jours
    // - N'ont jamais reçu de rappel d'inactivité
    const inactiveUsers = await this.db.user.findMany({
      where: {
        pushToken: { not: null },
        lastActiveAt: { lt: inactivityDate },
        lastInactivityReminderAt: null,
      },
      select: { id: true },
    });

    if (inactiveUsers.length === 0) {
      this.logger.log("Aucun utilisateur inactif à relancer.");
      return;
    }

    const userIds = inactiveUsers.map((u) => u.id);

    this.logger.log(`Envoi d'un rappel d'inactivité à ${userIds.length} utilisateur(s)...`);

    await this.notificationsService.sendPushNotifications(
      userIds,
      "Tu nous manques ! 🦉",
      "De nouveaux parcours nature t'attendent près de chez toi. Viens les découvrir !",
      { type: "inactivity_reminder" }
    );

    await this.db.user.updateMany({
      where: { id: { in: userIds } },
      data: { lastInactivityReminderAt: new Date() },
    });

    this.logger.log("Rappels d'inactivité envoyés avec succès.");
  }
}
