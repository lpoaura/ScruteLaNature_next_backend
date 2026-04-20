import {
  Injectable,
  ForbiddenException,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { DatabaseService } from '../../database/database.service';
import { RedisService } from '../../providers/redis/redis.service';
import { MailService } from '../../providers/mail/mail.service';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { authenticator } from 'otplib';
import * as qrcode from 'qrcode';
import { User, Role } from '@prisma/client';
import { RegisterUserDto } from './dto/register-user.dto';

export interface JwtPayload {
  email?: string | null;
  sub: string;
  role: Role;
  isTwoFactorAuthenticated?: boolean;
}

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private configService: ConfigService,
    private databaseService: DatabaseService,
    private redisService: RedisService,
    private mailService: MailService,
  ) {}

  async validateUser(
    email: string,
    pass: string,
  ): Promise<Omit<User, 'password'> | null> {
    const user = await this.usersService.findByEmailForAuth(email);

    if (user && user.password && (await bcrypt.compare(pass, user.password))) {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { password, ...result } = user;
      return result;
    }
    return null;
  }

  async login(
    user: Omit<User, 'password'>,
    ipAddress?: string,
    userAgent?: string,
  ) {
    // Si la 2FA est activée, on retourne un token "partiel" limité
    if (user.isTwoFactorEnabled) {
      const partial_token = await this.getPartialToken(
        user.id,
        user.email,
        user.role,
      );
      return {
        requires_2fa: true,
        partial_token,
        message:
          'Veuillez valider votre code 2FA pour obtenir un accès complet.',
      };
    }

    const tokens = await this.getTokens(user.id, user.email, user.role);
    await this.updateRefreshToken(
      user.id,
      tokens.refresh_token,
      ipAddress,
      userAgent,
    );

    return {
      requires_2fa: false,
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      user: {
        id: user.id,
        email: user.email,
        pseudo: user.pseudo,
        isGuest: user.isGuest,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
      },
    };
  }

  async register(registerUserDto: RegisterUserDto, ipAddress?: string, userAgent?: string) {
    const { password, ...otherData } = registerUserDto;
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    const user = await this.databaseService.user.create({
      data: {
        ...otherData,
        password: hashedPassword,
        role: Role.USER,
        isGuest: false,
      },
    });

    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);

    await this.databaseService.verificationToken.create({
      data: {
        userId: user.id,
        token: token,
        type: 'EMAIL_VERIFICATION',
        expiresAt: expiresAt,
      },
    });

    this.mailService.sendVerificationEmail(user.email!, token).catch(() => {});

    const tokens = await this.getTokens(user.id, user.email, user.role);
    await this.updateRefreshToken(user.id, tokens.refresh_token, ipAddress, userAgent);

    return {
      requires_2fa: false,
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      user: {
        id: user.id,
        email: user.email,
        pseudo: user.pseudo,
        role: user.role,
        isGuest: user.isGuest,
      },
    };
  }

  async createGuest(ipAddress?: string, userAgent?: string) {
    const randomGuestId = crypto.randomBytes(4).toString('hex');
    const guestUser = await this.databaseService.user.create({
      data: {
        pseudo: `Joueur_${randomGuestId}`,
        role: Role.USER,
        isGuest: true,
      },
    });

    const tokens = await this.getTokens(guestUser.id, guestUser.email, guestUser.role);
    await this.updateRefreshToken(
      guestUser.id,
      tokens.refresh_token,
      ipAddress,
      userAgent,
    );

    return {
      requires_2fa: false,
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      user: {
        id: guestUser.id,
        pseudo: guestUser.pseudo,
        role: guestUser.role,
        isGuest: guestUser.isGuest,
      },
    };
  }

  async logout(userId: string, accessToken?: string) {
    // 1. Invalide les sessions en base de données
    await this.databaseService.session.deleteMany({
      where: { userId },
    });

    if (accessToken) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        const decoded = this.jwtService.decode(accessToken);
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        if (decoded && typeof decoded.exp === 'number') {
          // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-member-access
          await this.redisService.blacklistToken(accessToken, decoded.exp);
        }
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
      } catch (_error) {
        // Ignorer l'erreur si le token est malformé, on déconnecte quand même
      }
    }

    return { message: 'Déconnexion réussie' };
  }

  async refreshTokens(
    userId: string,
    refreshToken: string,
    ipAddress?: string,
    userAgent?: string,
  ) {
    const user = await this.usersService.findOne(userId);
    if (!user) {
      throw new ForbiddenException('Accès refusé');
    }

    const sessions = await this.databaseService.session.findMany({
      where: { userId },
    });

    let validSessionId: string | null = null;

    for (const session of sessions) {
      const isRefreshMatch = await bcrypt.compare(
        refreshToken,
        session.hashedRefreshToken,
      );
      if (isRefreshMatch) {
        validSessionId = session.id;
        break;
      }
    }

    if (!validSessionId) {
      throw new ForbiddenException('Accès refusé');
    }

    const tokens = await this.getTokens(user.id, user.email, user.role);
    await this.updateRefreshToken(
      user.id,
      tokens.refresh_token,
      ipAddress,
      userAgent,
      validSessionId,
    );

    return tokens;
  }

  async verifyEmail(token: string) {
    const verification =
      await this.databaseService.verificationToken.findUnique({
        where: { token },
      });

    if (!verification || verification.type !== 'EMAIL_VERIFICATION') {
      throw new BadRequestException('Token invalide');
    }

    if (verification.expiresAt < new Date()) {
      await this.databaseService.verificationToken.delete({
        where: { id: verification.id },
      });
      throw new BadRequestException('Le token a expiré');
    }

    await this.databaseService.user.update({
      where: { id: verification.userId },
      data: { isEmailVerified: true },
    });

    await this.databaseService.verificationToken.delete({
      where: { id: verification.id },
    });

    return { message: 'Email vérifié avec succès' };
  }

  async forgotPassword(email: string) {
    const user = await this.databaseService.user.findUnique({
      where: { email },
    });

    if (user) {
      const token = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 1); // Valide 1 heure

      await this.databaseService.verificationToken.create({
        data: {
          userId: user.id,
          token,
          type: 'PASSWORD_RESET',
          expiresAt,
        },
      });

      this.mailService.sendPasswordResetEmail(user.email!, token).catch(() => {
        // Log ou ignorer
      });
    }

    // On retourne toujours un succès pour éviter le User Enumeration Attack (sécurité)
    return {
      message:
        'Si un compte existe avec cet email, un lien de réinitialisation a été envoyé.',
    };
  }

  async resetPassword(token: string, newPassword: string) {
    const verification =
      await this.databaseService.verificationToken.findUnique({
        where: { token },
      });

    if (!verification || verification.type !== 'PASSWORD_RESET') {
      throw new BadRequestException('Token invalide');
    }

    if (verification.expiresAt < new Date()) {
      await this.databaseService.verificationToken.delete({
        where: { id: verification.id },
      });
      throw new BadRequestException('Le token a expiré');
    }

    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

    await this.databaseService.user.update({
      where: { id: verification.userId },
      data: { password: hashedPassword },
    });

    // Invalider toutes les sessions actives (le forcer à se reconnecter partout)
    await this.databaseService.session.deleteMany({
      where: { userId: verification.userId },
    });

    await this.databaseService.verificationToken.delete({
      where: { id: verification.id },
    });

    return { message: 'Mot de passe réinitialisé avec succès' };
  }

  private async updateRefreshToken(
    userId: string,
    refreshToken: string,
    ipAddress?: string,
    userAgent?: string,
    sessionId?: string,
  ) {
    const hash = await bcrypt.hash(refreshToken, 10);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    if (sessionId) {
      await this.databaseService.session.update({
        where: { id: sessionId },
        data: {
          hashedRefreshToken: hash,
          expiresAt,
          ipAddress: ipAddress ?? null,
          userAgent: userAgent ?? null,
        },
      });
    } else {
      await this.databaseService.session.create({
        data: {
          userId,
          hashedRefreshToken: hash,
          expiresAt,
          ipAddress: ipAddress ?? null,
          userAgent: userAgent ?? null,
        },
      });
    }
  }

  private async getPartialToken(userId: string, email: string | null, role: Role) {
    const payload: JwtPayload = {
      sub: userId,
      email,
      role,
      isTwoFactorAuthenticated: false,
    };
    const secret = this.configService.get<string>('JWT_SECRET');
    return this.jwtService.signAsync(payload, {
      secret,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      expiresIn: '5m' as any, // Token court uniquement pour la phase 2FA
    });
  }

  // ─── 2FA ─────────────────────────────────────────────────────────────────────

  async generate2faSecret(userId: string, email: string) {
    const secret = authenticator.generateSecret();
    const appName =
      this.configService.get<string>('APP_NAME') ?? 'NestBoilerplate';
    const otpauthUrl = authenticator.keyuri(email, appName, secret);

    // Stocker le secret temporairement (non encore activé)
    await this.databaseService.user.update({
      where: { id: userId },
      data: { twoFactorSecret: secret },
    });

    const qrCodeDataUrl = await qrcode.toDataURL(otpauthUrl);
    return { qrCodeDataUrl, secret };
  }

  async activate2fa(userId: string, code: string) {
    const user = await this.databaseService.user.findUnique({
      where: { id: userId },
    });

    if (!user?.twoFactorSecret) {
      throw new BadRequestException(
        'Aucun secret 2FA généré. Appelez /2fa/generate en premier.',
      );
    }

    const isValid = authenticator.check(code, user.twoFactorSecret);
    if (!isValid) {
      throw new UnauthorizedException(
        'Code 2FA invalide. Vérifiez votre application et réessayez.',
      );
    }

    await this.databaseService.user.update({
      where: { id: userId },
      data: { isTwoFactorEnabled: true },
    });

    return { message: 'Double authentification activée avec succès !' };
  }

  async disable2fa(userId: string, code: string) {
    const user = await this.databaseService.user.findUnique({
      where: { id: userId },
    });

    if (!user?.isTwoFactorEnabled || !user.twoFactorSecret) {
      throw new BadRequestException("La 2FA n'est pas activée sur ce compte.");
    }

    const isValid = authenticator.check(code, user.twoFactorSecret);
    if (!isValid) {
      throw new UnauthorizedException('Code 2FA invalide.');
    }

    await this.databaseService.user.update({
      where: { id: userId },
      data: { isTwoFactorEnabled: false, twoFactorSecret: null },
    });

    return { message: 'Double authentification désactivée.' };
  }

  async authenticate2fa(
    userId: string,
    code: string,
    ipAddress?: string,
    userAgent?: string,
  ) {
    const user = await this.databaseService.user.findUnique({
      where: { id: userId },
    });

    if (!user?.twoFactorSecret) {
      throw new ForbiddenException('Accès refusé.');
    }

    const isValid = authenticator.check(code, user.twoFactorSecret);
    if (!isValid) {
      throw new UnauthorizedException('Code 2FA invalide.');
    }

    const tokens = await this.getTokens(user.id, user.email, user.role, true);
    await this.updateRefreshToken(
      user.id,
      tokens.refresh_token,
      ipAddress,
      userAgent,
    );

    return {
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
      },
    };
  }

  private async getTokens(
    userId: string,
    email: string | null,
    role: string,
    isTwoFactorAuthenticated = false,
  ) {
    const payload: JwtPayload = {
      sub: userId,
      email,
      role: role as Role,
      isTwoFactorAuthenticated,
    };

    const secret = this.configService.get<string>('JWT_SECRET');
    const expiresIn = this.configService.get<string>('JWT_EXPIRATION') || '15m';

    const refreshSecret = this.configService.get<string>('JWT_REFRESH_SECRET');
    const refreshExpiresIn =
      this.configService.get<string>('JWT_REFRESH_EXPIRATION') || '7d';

    const [access_token, refresh_token] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        expiresIn: expiresIn as any,
      }),
      this.jwtService.signAsync(payload, {
        secret: refreshSecret,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        expiresIn: refreshExpiresIn as any,
      }),
    ]);

    return { access_token, refresh_token };
  }

  // ─── OAuth (Google) ────────────────────────────────────────────────────────

  async loginWithGoogle(
    googleUser: {
      providerUserId: string;
      provider: 'GOOGLE';
      email: string;
      firstName: string;
      lastName: string;
    },
    ipAddress?: string,
    userAgent?: string,
  ) {
    // 1. Chercher si un compte OAuth lié existe déjà
    const oauthAccount = await this.databaseService.oAuthAccount.findUnique({
      where: {
        provider_providerUserId: {
          provider: googleUser.provider,
          providerUserId: googleUser.providerUserId,
        },
      },
      include: { user: true },
    });

    let user = oauthAccount?.user ?? null;

    // 2. Sinon: chercher par email ou créer un nouveau compte
    if (!user) {
      const existingUser = await this.databaseService.user.findUnique({
        where: { email: googleUser.email },
      });

      if (existingUser) {
        // L'email existe déjà → on rattache simplement le compte Google
        user = existingUser;
      } else {
        // Création d'un nouveau compte (sans mot de passe)
        user = await this.databaseService.user.create({
          data: {
            email: googleUser.email,
            firstName: googleUser.firstName,
            lastName: googleUser.lastName,
            isEmailVerified: true, // Google a déjà vérifié l'email
          },
        });
      }

      // Créer le lien OAuth dans la table oauth_accounts
      await this.databaseService.oAuthAccount.create({
        data: {
          userId: user.id,
          provider: googleUser.provider,
          providerUserId: googleUser.providerUserId,
        },
      });
    }

    // 3. Générer les tokens JWT comme pour un login classique
    const tokens = await this.getTokens(user.id, user.email, user.role, true);
    await this.updateRefreshToken(
      user.id,
      tokens.refresh_token,
      ipAddress,
      userAgent,
    );

    return {
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
      },
    };
  }
}
