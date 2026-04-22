import { HttpAdapterHost, NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { PrismaClientExceptionFilter } from './common/filters/filters-prisma-exceptions.filter';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { NestExpressApplication } from '@nestjs/platform-express';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { join } from 'path';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Servir les fichiers uploadés en statique sous /uploads
  app.useStaticAssets(join(process.cwd(), 'uploads'), {
    prefix: '/uploads',
  });

  // Servir les assets publics (logo LPO, etc.) sous /public
  app.useStaticAssets(join(process.cwd(), 'public'), {
    prefix: '/public',
  });

  // Activation de CORS avec configuration par défaut (à adapter en prod)
  app.enableCors();

  // Helmet pour sécuriser les en-têtes HTTP
  app.use(helmet());

  // Rate Limiting (100 requêtes par fenêtre de 15 minutes par IP)
  app.use(
    rateLimit({
      windowMs: 15 * 60 * 1000,
      max: 100,
      message: 'Too many requests from this IP, please try again later.',
    }),
  );

  // prefixer nos routes avec api
  app.setGlobalPrefix('api');

  // Configuration de la validation globale pour class-validator / class-transformer
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // Supprime automatiquement les propriétés non définies dans le DTO
      transform: true, // Transforme automatiquement les payloads en instances de DTOs, et fait la conversion des types primitifs
      forbidNonWhitelisted: true, // Lève une erreur si des propriétés non autorisées sont envoyées
    }),
  );

  // Récupération de l'adaptateur HTTP (Express par défaut instancié par NestJS)
  const { httpAdapter } = app.get(HttpAdapterHost);

  // Enregistrement du filtre globalement
  app.useGlobalFilters(new PrismaClientExceptionFilter(httpAdapter));

  // Configuration Swagger
  const config = new DocumentBuilder()
    .setTitle('Scrute La Nature — API Backend')
    .setDescription('Documentation de toutes les API du projet LPO Scrute La Nature')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const documentFactory = () => SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, documentFactory);

  await app.listen(process.env.PORT ?? 3000);
}
void bootstrap();
