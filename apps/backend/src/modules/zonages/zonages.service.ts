import {
  Injectable,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import { CreateZonageDto } from './dto/create-zonage.dto';

@Injectable()
export class ZonagesService {
  constructor(private readonly db: DatabaseService) {}

  async findAll() {
    return this.db.zonage.findMany({
      select: { id: true, nom: true, codePostal: true },
      orderBy: { nom: 'asc' },
    });
  }

  async create(dto: CreateZonageDto) {
    const existing = await this.db.zonage.findUnique({ where: { nom: dto.nom } });
    if (existing) throw new ConflictException(`La zonage "${dto.nom}" existe déjà`);
    return this.db.zonage.create({ data: dto });
  }

  async getStatsForInvestors() {
    // ── Approche scalable : on fait 3 requêtes SQL agrégées en parallèle ──
    // au lieu de charger tous les joueurs de tous les parcours en mémoire.

    const [zonages, completionsByZonage, avgRatingsByZonage] = await Promise.all([

      // 1. La liste des zonages avec leur nombre de parcours
      this.db.zonage.findMany({
        select: {
          id: true,
          nom: true,
          codePostal: true,
          _count: { select: { parcours: true } },
        },
        orderBy: { nom: 'asc' },
      }),

      // 2. Agrégation SQL : par zonage → total completions + joueurs uniques
      //    On fait le calcul via les parcours pour relier zonage → user_parcours
      this.db.userParcours.groupBy({
        by: ['parcoursId'],
        _count: { userId: true },
      }).then(async (grouped) => {
        // On récupère le zonageId de chaque parcours en une seule requête
        if (grouped.length === 0) return {};
        const parcoursIds = grouped.map((g) => g.parcoursId);
        const parcoursList = await this.db.parcours.findMany({
          where: { id: { in: parcoursIds } },
          select: { id: true, zonageId: true },
        });

        // Map parcoursId → zonageId
        const parcoursToZonage = new Map(parcoursList.map((p) => [p.id, p.zonageId]));

        // Accumule par zonageId : { totalCompletions, allPlayerIds }
        const acc: Record<string, { completions: number; playerIds: Set<string> }> = {};

        // Pour les joueurs uniques on a besoin des userIds individuels
        const allRows = await this.db.userParcours.findMany({
          where: { parcoursId: { in: parcoursIds } },
          select: { parcoursId: true, userId: true },
        });

        for (const row of allRows) {
          const zonageId = parcoursToZonage.get(row.parcoursId);
          if (!zonageId) continue;
          if (!acc[zonageId]) acc[zonageId] = { completions: 0, playerIds: new Set() };
          acc[zonageId].completions++;
          acc[zonageId].playerIds.add(row.userId);
        }

        return acc;
      }),

      // 3. Note moyenne par zonage (via jointure parcours → reviews)
      this.db.review.groupBy({
        by: ['parcoursId'],
        _avg: { rating: true },
        _count: { rating: true },
      }).then(async (grouped) => {
        if (grouped.length === 0) return {};
        const parcoursIds = grouped.map((g) => g.parcoursId);
        const parcoursList = await this.db.parcours.findMany({
          where: { id: { in: parcoursIds } },
          select: { id: true, zonageId: true },
        });
        const parcoursToZonage = new Map(parcoursList.map((p) => [p.id, p.zonageId]));

        const acc: Record<string, { totalRating: number; count: number }> = {};
        for (const g of grouped) {
          const zonageId = parcoursToZonage.get(g.parcoursId);
          if (!zonageId || !g._avg.rating) continue;
          if (!acc[zonageId]) acc[zonageId] = { totalRating: 0, count: 0 };
          acc[zonageId].totalRating += g._avg.rating * g._count.rating;
          acc[zonageId].count += g._count.rating;
        }

        return Object.fromEntries(
          Object.entries(acc).map(([id, v]) => [
            id,
            Math.round((v.totalRating / v.count) * 10) / 10,
          ]),
        );
      }),
    ]);

    // ── Fusion des 3 sources en un tableau analytique propre ──────────────
    return zonages.map((z) => {
      const stats = (completionsByZonage as any)[z.id];
      const avgRating = (avgRatingsByZonage as any)[z.id] ?? null;

      return {
        id: z.id,
        nom: z.nom,
        codePostal: z.codePostal,
        totalParcours: z._count.parcours,
        totalCompletions: stats?.completions ?? 0,
        uniquePlayers: stats?.playerIds.size ?? 0,
        averageRating: avgRating,
      };
    });
  }


  async getGlobalDashboardStats() {
    const [totalParcours, draftsCount, totalPlayers, guestPlayers, statsZonages, co2] = await Promise.all([
      this.db.parcours.count({ where: { status: { not: 'ARCHIVED' } } }),
      this.db.parcours.count({ where: { status: 'DRAFT' } }),
      this.db.user.count({ where: { role: 'USER' } }), 
      this.db.user.count({ where: { isGuest: true } }),
      this.db.zonage.count(),
      this.db.user.aggregate({ _sum: { co2Saved: true } }),
    ]);

    const totalInscrits = await this.db.user.count({ where: { role: 'USER', isGuest: false } });

    return {
      parcours: {
        actifs: totalParcours - draftsCount,
        brouillons: draftsCount,
      },
      joueurs: {
        total: totalPlayers,
        invites: guestPlayers,
      },
      co2: co2._sum.co2Saved ?? 0,
      zonages: statsZonages,
    };
  }

  async findOne(id: string) {
    const zonage = await this.db.zonage.findUnique({ where: { id } });
    if (!zonage) throw new NotFoundException(`Zonage #${id} introuvable`);
    return zonage;
  }
}
