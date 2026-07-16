import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import { RecordHistoryDto } from './dto/record-history.dto';

@Injectable()
export class HistoryService {
  private readonly logger = new Logger(HistoryService.name);

  constructor(private readonly prisma: DatabaseService) {}

  async getUserHistory(userId: string) {
    return this.prisma.userParcours.findMany({
      where: { userId },
      include: {
        parcours: {
          select: {
            id: true,
            title: true,
            coverImage: true,
            difficulty: true,
            durationMin: true,
            distanceKm: true,
          },
        },
      },
      orderBy: { completedAt: 'desc' },
    });
  }

  async recordHistory(userId: string, dto: RecordHistoryDto) {
    const { parcoursId, score, syncId, completedAt } = dto;
    const completedDate = completedAt ? new Date(completedAt) : new Date();

    // Protection contre les doublons si on est en synchronisation hors-ligne
    if (syncId) {
      const existing = await this.prisma.userParcours.findUnique({
        where: { syncId },
      });
      if (existing) {
        this.logger.debug(`History already synced (syncId=${syncId})`);
        return existing;
      }
    }

    // Upsert (si le même parcours a déjà été joué, on peut choisir de mettre à jour le score ou pas. 
    // Ici, le design LPO permet potentiellement de rejouer. Mais Prisma schema a : @@unique([userId, parcoursId])
    // Donc on DOIT utiliser upsert et on garde le meilleur score par exemple, ou juste le dernier.
    return this.prisma.userParcours.upsert({
      where: {
        userId_parcoursId: {
          userId,
          parcoursId,
        },
      },
      update: {
        score,
        completedAt: completedDate,
        syncId: syncId || undefined,
      },
      create: {
        userId,
        parcoursId,
        score,
        completedAt: completedDate,
        syncId,
      },
    });
  }
}
