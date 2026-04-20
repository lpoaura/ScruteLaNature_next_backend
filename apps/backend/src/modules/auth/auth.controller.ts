import {
  Controller,
  Post,
  UseGuards,
  Request,
  Body,
  Get,
  Query,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { LocalAuthGuard } from '../../common/guards/local-auth.guard';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { JwtRefreshAuthGuard } from '../../common/guards/jwt-refresh-auth.guard';
import { GoogleAuthGuard } from '../../common/guards/google-auth.guard';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { LoginDto } from './dto/login.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { Verify2faDto } from './dto/verify-2fa.dto';
import type { Request as ExpressRequest } from 'express';
import { User, Role } from '@prisma/client';
import { Public } from '../../common/decorators/public.decorator';

export interface RequestWithUser extends ExpressRequest {
  user: Omit<User, 'password'>;
}

export interface RequestWithRefresh extends ExpressRequest {
  user: {
    email?: string | null;
    sub: string;
    role: Role;
    refreshToken: string;
  };
}

// Payload injecté par le JwtStrategy depuis le partial_token
export interface RequestWithJwtPayload extends ExpressRequest {
  user: {
    sub: string;
    email?: string | null;
    role: Role;
    isTwoFactorAuthenticated: boolean;
  };
}

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Public()
  @UseGuards(LocalAuthGuard)
  @Post('login')
  @ApiOperation({
    summary: "Se connecter à l'API pour obtenir un JWT Access et Refresh",
  })
  @ApiBody({ type: LoginDto })
  @ApiResponse({
    status: 200,
    description:
      'Connexion réussie, retourne les Tokens JWT. Si 2FA activé, retourne un partial_token.',
  })
  @ApiResponse({ status: 401, description: 'Email ou mot de passe invalide.' })
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  login(@Request() req: RequestWithUser, @Body() _loginDto: LoginDto) {
    const userAgent = req.headers['user-agent'];
    return this.authService.login(req.user, req.ip, userAgent);
  }

  @Public()
  @Post('guest')
  @ApiOperation({
    summary: 'Créer un compte Invité silencieux pour jouer immédiatement',
  })
  @ApiResponse({
    status: 201,
    description: 'Compte invité créé, retourne les Tokens JWT.',
  })
  createGuest(@Request() req: ExpressRequest) {
    const userAgent = req.headers['user-agent'];
    return this.authService.createGuest(req.ip, userAgent);
  }

  @ApiBearerAuth()
  @Post('logout')
  @ApiOperation({
    summary:
      'Se déconnecter (invalide les sessions et met le token sur liste noire)',
  })
  @ApiResponse({ status: 200, description: 'Déconnexion réussie.' })
  logout(@Request() req: RequestWithUser) {
    const rawToken = req.headers.authorization?.split(' ')[1];
    return this.authService.logout(req.user.id, rawToken);
  }

  @Public()
  @UseGuards(JwtRefreshAuthGuard)
  @Post('refresh')
  @ApiBearerAuth()
  @ApiOperation({
    summary: "Renouveler le token d'accès avec un Refresh Token",
  })
  @ApiResponse({ status: 200, description: 'Token renouvelé avec succès.' })
  refreshTokens(@Request() req: RequestWithRefresh) {
    const userAgent = req.headers['user-agent'];
    return this.authService.refreshTokens(
      req.user.sub,
      req.user.refreshToken,
      req.ip,
      userAgent,
    );
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get('profile')
  @ApiOperation({
    summary: 'Exemple de route sécurisée: Récupérer le profil courant',
  })
  getProfile(@Request() req: RequestWithUser) {
    return req.user;
  }

  @Public()
  @Get('verify-email')
  @ApiOperation({ summary: "Vérifier l'adresse email avec un token" })
  @ApiQuery({ name: 'token', required: true })
  @ApiResponse({ status: 200, description: 'Email vérifié avec succès.' })
  @ApiResponse({ status: 400, description: 'Token invalide ou expiré.' })
  verifyEmail(@Query('token') token: string) {
    return this.authService.verifyEmail(token);
  }

  @Public()
  @Post('forgot-password')
  @ApiOperation({ summary: 'Demander une réinitialisation de mot de passe' })
  @ApiBody({ type: ForgotPasswordDto })
  @ApiResponse({
    status: 200,
    description: "Email de réinitialisation envoyé si l'utilisateur existe.",
  })
  forgotPassword(@Body() forgotPasswordDto: ForgotPasswordDto) {
    return this.authService.forgotPassword(forgotPasswordDto.email);
  }

  @Public()
  @Post('reset-password')
  @ApiOperation({ summary: 'Réinitialiser le mot de passe avec un token' })
  @ApiBody({ type: ResetPasswordDto })
  @ApiResponse({
    status: 200,
    description: 'Mot de passe réinitialisé avec succès.',
  })
  @ApiResponse({ status: 400, description: 'Token invalide ou expiré.' })
  resetPassword(@Body() resetPasswordDto: ResetPasswordDto) {
    return this.authService.resetPassword(
      resetPasswordDto.token,
      resetPasswordDto.password,
    );
  }

  // ─── 2FA ─────────────────────────────────────────────────────────────────────

  @ApiBearerAuth()
  @Get('2fa/generate')
  @ApiOperation({
    summary: 'Générer un QR Code pour configurer Google Authenticator (2FA)',
  })
  @ApiResponse({
    status: 200,
    description: 'Retourne un QR Code (base64) et le secret à scanner.',
  })
  generate2fa(@Request() req: RequestWithUser) {
    return this.authService.generate2faSecret(req.user.id, req.user.email!);
  }

  @ApiBearerAuth()
  @Post('2fa/activate')
  @ApiOperation({
    summary: 'Activer la 2FA en validant le premier code de son application',
  })
  @ApiBody({ type: Verify2faDto })
  @ApiResponse({ status: 200, description: '2FA activée avec succès.' })
  @ApiResponse({ status: 401, description: 'Code 2FA invalide.' })
  activate2fa(@Request() req: RequestWithUser, @Body() dto: Verify2faDto) {
    return this.authService.activate2fa(req.user.id, dto.code);
  }

  @ApiBearerAuth()
  @Post('2fa/disable')
  @ApiOperation({ summary: 'Désactiver la 2FA (nécessite un code valide)' })
  @ApiBody({ type: Verify2faDto })
  @ApiResponse({ status: 200, description: '2FA désactivée.' })
  @ApiResponse({ status: 401, description: 'Code 2FA invalide.' })
  disable2fa(@Request() req: RequestWithUser, @Body() dto: Verify2faDto) {
    return this.authService.disable2fa(req.user.id, dto.code);
  }

  @Public()
  @UseGuards(JwtAuthGuard)
  @Post('2fa/authenticate')
  @ApiBearerAuth()
  @ApiOperation({
    summary:
      'Valider le code 2FA avec le partial_token pour obtenir les vrais tokens JWT',
  })
  @ApiBody({ type: Verify2faDto })
  @ApiResponse({
    status: 200,
    description: 'Authentification 2FA réussie, retourne les tokens complets.',
  })
  @ApiResponse({
    status: 401,
    description: 'Code 2FA invalide ou partial_token expiré.',
  })
  authenticate2fa(
    @Request() req: RequestWithJwtPayload,
    @Body() dto: Verify2faDto,
  ) {
    const userAgent = req.headers['user-agent'];
    return this.authService.authenticate2fa(
      req.user.sub,
      dto.code,
      req.ip,
      userAgent,
    );
  }

  // ─── OAuth (Google) ────────────────────────────────────────────────────────

  @Public()
  @UseGuards(GoogleAuthGuard)
  @Get('google')
  @ApiOperation({ summary: "S'authentifier via Google" })
  googleAuth() {
    // Redirige vers la page de login Google
  }

  @Public()
  @UseGuards(GoogleAuthGuard)
  @Get('google/callback')
  @ApiOperation({ summary: 'Callback appelé par Google après autorisation' })
  googleAuthCallback(
    @Request()
    req: ExpressRequest & {
      user: {
        providerUserId: string;
        provider: 'GOOGLE';
        email: string;
        firstName: string;
        lastName: string;
      };
    },
  ) {
    const userAgent = req.headers['user-agent'];
    return this.authService.loginWithGoogle(req.user, req.ip, userAgent);
  }
}
