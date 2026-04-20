import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import { RedisService } from '../../../providers/redis/redis.service';
import { JwtPayload } from '../auth.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private configService: ConfigService,
    private redisService: RedisService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET') || 'fallback_secret',
      passReqToCallback: true, // Nécessaire pour extraire le token de la requête
    });
  }

  async validate(req: Request, payload: JwtPayload) {
    const rawToken = req.headers.authorization?.split(' ')[1];

    if (!rawToken || !payload?.sub) {
      throw new UnauthorizedException();
    }

    // 🔥 Vérifie si le Token a été révoqué volontairement (blacklist)
    const isBlacklisted = await this.redisService.isTokenBlacklisted(rawToken);
    if (isBlacklisted) {
      throw new UnauthorizedException('Token révoqué');
    }

    return { id: payload.sub, email: payload.email, role: payload.role };
  }
}
