import { Injectable, Logger } from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';
import { AppConfigService } from '../../config/app-config.service';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);

  constructor(
    private mailerService: MailerService,
    private appConfig: AppConfigService,
  ) {}

  async sendVerificationEmail(email: string, token: string) {
    const url = this.appConfig.buildVerifyEmailUrl(token);
    const logoUrl = `${this.appConfig.appUrl}/public/logo_lpo.png`;

    try {
      await this.mailerService.sendMail({
        to: email,
        subject: 'Vérifiez votre adresse email — Scrute La Nature',
        template: './verify-email',
        context: { url, logoUrl },
      });
      this.logger.log(`Email de confirmation envoyé à ${email}`);
    } catch (error) {
      this.logger.error(`Erreur d'envoi d'email à ${email}`, error);
    }
  }

  async sendPasswordResetEmail(email: string, token: string) {
    const url = this.appConfig.buildResetPasswordUrl(token);
    const logoUrl = `${this.appConfig.appUrl}/public/logo_lpo.png`;

    try {
      await this.mailerService.sendMail({
        to: email,
        subject: 'Réinitialisation de votre mot de passe — Scrute La Nature',
        template: './reset-password',
        context: { url, logoUrl },
      });
      this.logger.log(`Email de reset de mot de passe envoyé à ${email}`);
    } catch (error) {
      this.logger.error(`Erreur d'envoi d'email de reset à ${email}`, error);
    }
  }
}
