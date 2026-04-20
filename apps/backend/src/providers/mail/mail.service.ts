import { Injectable, Logger } from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);

  constructor(
    private mailerService: MailerService,
    private configService: ConfigService,
  ) {}

  async sendVerificationEmail(email: string, token: string) {
    const url = `http://localhost:3000/api/auth/verify-email?token=${token}`;

    try {
      await this.mailerService.sendMail({
        to: email,
        subject: 'Vérifiez votre adresse email',
        template: './verify-email', // Correspond au nom du fichier .ejs sans l'extension
        context: {
          url,
        },
      });
      this.logger.log(`Email de confirmation envoyé à ${email}`);
    } catch (error) {
      this.logger.error(`Erreur d'envoi d'email à ${email}`, error);
    }
  }

  async sendPasswordResetEmail(email: string, token: string) {
    const url = `http://localhost:3000/api/auth/reset-password?token=${token}`;

    try {
      await this.mailerService.sendMail({
        to: email,
        subject: 'Réinitialisation de votre mot de passe',
        template: './reset-password', // On va créer ce fichier plus tard
        context: {
          url,
        },
      });
      this.logger.log(`Email de reset de mot de passe envoyé à ${email}`);
    } catch (error) {
      this.logger.error(`Erreur d'envoi d'email de reset à ${email}`, error);
    }
  }
}
