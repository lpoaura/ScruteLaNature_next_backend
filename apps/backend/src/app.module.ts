import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AppConfigModule } from './config/app-config.module';
import { DatabaseModule } from './database/database.module';
import { UsersModule } from './modules/users/users.module';
import { AuthModule } from './modules/auth/auth.module';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { RolesGuard } from './common/guards/roles.guard';

import { MailModule } from './providers/mail/mail.module';
import { AgencesModule } from './modules/agences/agences.module';
import { CommunesModule } from './modules/communes/communes.module';
import { MediasModule } from './modules/medias/medias.module';
import { ParcoursModule } from './modules/parcours/parcours.module';
import { MobileModule } from './modules/mobile/mobile.module';
import { MailerModule } from '@nestjs-modules/mailer';
import { EjsAdapter } from '@nestjs-modules/mailer/adapters/ejs.adapter';
import { join } from 'path';
import { EtapesModule } from './modules/etapes/etapes.module';
import { JeuxModule } from './modules/jeux/jeux.module';

@Module({
  imports: [ 
    ConfigModule.forRoot({ isGlobal: true }),
    AppConfigModule,
    DatabaseModule,

    MailerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        transport: {
          host: config.get<string>('MAIL_HOST'),
          port: config.get<number>('MAIL_PORT'),
          secure: false,
          auth: {
            user: config.get<string>('MAIL_USER'),
            pass: config.get<string>('MAIL_PASSWORD'),
          },
        },
        defaults: {
          from: `"No Reply" <${config.get<string>('MAIL_FROM')}>`,
        },
        template: {
          dir: join(__dirname, 'providers/mail/templates'),
          adapter: new EjsAdapter(),
          options: {
            strict: false,
          },
        },
      }),
    }),
    MailModule,
    UsersModule,
    AuthModule,
    AgencesModule,
    CommunesModule,
    MediasModule,
    ParcoursModule,
    MobileModule,
    EtapesModule,
    JeuxModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard, // Active la protection sur toutes les routes de l'app !
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard, // Sécurise les rôles sur les routes demandées après le JwtAuthGuard
    },
  ],
})
export class AppModule {}
