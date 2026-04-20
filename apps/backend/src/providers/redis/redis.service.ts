import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private redisClient: Redis;

  constructor(private configService: ConfigService) {}

  onModuleInit() {
    this.redisClient = new Redis({
      host: this.configService.get<string>('REDIS_HOST', 'localhost'),
      port: this.configService.get<number>('REDIS_PORT', 6379),
      password: this.configService.get<string>('REDIS_PASSWORD', ''),
    });
  }

  onModuleDestroy() {
    this.redisClient.disconnect();
  }

  // Permet d'ajouter un token à la liste noire avec une durée d'expiration
  async blacklistToken(
    token: string,
    expiresInUnixSeconds: number,
  ): Promise<void> {
    const key = `blacklist:${token}`;
    const now = Math.floor(Date.now() / 1000);
    const ttl = expiresInUnixSeconds - now;

    if (ttl > 0) {
      await this.redisClient.set(key, 'revoked', 'EX', ttl);
    }
  }

  // Vérifie si un token est dans la liste noire
  async isTokenBlacklisted(token: string): Promise<boolean> {
    const key = `blacklist:${token}`;
    const result = await this.redisClient.get(key);
    return result !== null;
  }
}
