import { ArgumentsHost, Catch, HttpStatus } from '@nestjs/common';
import { BaseExceptionFilter } from '@nestjs/core';
import { Prisma } from '@prisma/client';
import { Response } from 'express';

@Catch(Prisma.PrismaClientKnownRequestError) // N'attrape QUE les erreurs connues de Prisma
export class PrismaClientExceptionFilter extends BaseExceptionFilter {
  catch(exception: Prisma.PrismaClientKnownRequestError, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    switch (exception.code) {
      case 'P2002': {
        // P2002 : Unique constraint failed (ex: l'email existe déjà)
        const status = HttpStatus.CONFLICT; // Code HTTP 409
        response.status(status).json({
          statusCode: status,
          message:
            'Une contrainte unique a échoué. Cet enregistrement existe déjà.',
          error: 'Conflict',
        });
        break;
      }
      case 'P2025': {
        // P2025 : Record not found (ex: supprimer un id qui n'existe pas)
        const status = HttpStatus.NOT_FOUND; // Code HTTP 404
        response.status(status).json({
          statusCode: status,
          message: 'Enregistrement introuvable en base de données.',
          error: 'Not Found',
        });
        break;
      }
      default:
        // Si c'est une autre erreur, on laisse NestJS gérer (500)
        super.catch(exception, host);
        break;
    }
  }
}
