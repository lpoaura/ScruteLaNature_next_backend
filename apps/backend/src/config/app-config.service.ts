import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * Service centralisé pour la configuration de l'application.
 * Toutes les URLs et variables d'environnement critiques passent par ici.
 * Pour changer l'URL de base, modifiez uniquement APP_URL dans le fichier .env.
 */
@Injectable()
export class AppConfigService {
  constructor(private readonly config: ConfigService) {}

  // ─── URL de base ───────────────────────────────────────────────────────────

  get appUrl(): string {
    return this.config.get<string>('APP_URL') || 'http://localhost:3000';
  }

  get apiUrl(): string {
    return `${this.appUrl}/api`;
  }

  // ─── URLs Auth (Email) ─────────────────────────────────────────────────────

  get verifyEmailUrl(): string {
    return `${this.apiUrl}/auth/verify-email`;
  }

  get resetPasswordUrl(): string {
    return `${this.apiUrl}/auth/reset-password`;
  }

  buildVerifyEmailUrl(token: string): string {
    return `${this.verifyEmailUrl}?token=${token}`;
  }

  buildResetPasswordUrl(token: string): string {
    return `${this.resetPasswordUrl}?token=${token}`;
  }

  // ─── URLs Médias (Fichiers statiques) ──────────────────────────────────────

  buildMediaUrl(subfolder: 'images' | 'audio' | 'gpx', filename: string): string {
    return `${this.appUrl}/uploads/${subfolder}/${filename}`;
  }

  // ─── Autres variables d'environnement ──────────────────────────────────────

  get appName(): string {
    return this.config.get<string>('APP_NAME') || 'Scrute La Nature';
  }

  get nodeEnv(): string {
    return this.config.get<string>('NODE_ENV') || 'development';
  }

  get isProduction(): boolean {
    return this.nodeEnv === 'production';
  }
}
