import {
  Controller,
  Post,
  UseGuards,
  Request,
  Body,
  Get,
  Query,
  Res,
} from '@nestjs/common';
import type { Response } from 'express';
import { join } from 'path';
import { AuthService } from './auth.service';
import { LocalAuthGuard } from '../../common/guards/local-auth.guard';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { JwtRefreshAuthGuard } from '../../common/guards/jwt-refresh-auth.guard';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { LoginDto } from './dto/login.dto';
import { RegisterUserDto } from './dto/register-user.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
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
  @Post('register')
  @ApiOperation({
    summary: 'Créer un nouveau compte Joueur',
  })
  @ApiResponse({
    status: 201,
    description: 'Compte créé avec succès, retourne les Tokens JWT.',
  })
  register(@Request() req: ExpressRequest, @Body() dto: RegisterUserDto) {
    const userAgent = req.headers['user-agent'];
    return this.authService.register(dto, req.ip, userAgent);
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
  @ApiResponse({ status: 200, description: 'Page HTML de confirmation avec deep link vers l\'app.' })
  @ApiResponse({ status: 400, description: 'Token invalide ou expiré.' })
  async verifyEmail(@Query('token') token: string, @Res() res: Response) {
    await this.authService.verifyEmail(token);
    // Sert la page HTML de confirmation avec deep link automatique vers l'app
    // Le fichier est copié dans dist/src/ par nest-cli.json assets
    const htmlPath = join(process.cwd(), 'dist', 'src', 'providers', 'mail', 'templates', 'email-verified.html');
    res.sendFile(htmlPath);
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

}
