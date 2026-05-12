import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import { Role } from '@prisma/client';

@Injectable()
export class StatsService {
  constructor(private readonly db: DatabaseService) {}

  async getDashboardStats(role: Role, organismeId: string | null) {
    const isSuperAdmin = role === Role.SUPER_ADMIN;
    const parcoursFilter = isSuperAdmin ? {} : { organismeId: organismeId! };
    const userFilter = isSuperAdmin ? { isGuest: false } : { isGuest: false, organismeId: organismeId! };

    // 1. Chiffres globaux
    const totalParcours = await this.db.parcours.count({ where: parcoursFilter });
    const totalUsers = await this.db.user.count({ where: userFilter });
    const totalObservations = await this.db.observation.count({
      where: isSuperAdmin ? undefined : { user: { organismeId: organismeId! } }
    });
    const totalCompletions = await this.db.userParcours.count({
      where: isSuperAdmin ? undefined : { parcours: parcoursFilter }
    });

    // 2. Tableau croisé dynamique des organismes (financeurs)
    // On veut le nombre de parcours, la distance totale, et le nb de participants
    const organismes = await this.db.organisme.findMany({
      where: isSuperAdmin ? undefined : { id: organismeId! },
      include: {
        parcours: {
          select: {
            id: true,
            distanceKm: true,
            _count: {
              select: { usersStats: true },
            },
          },
        },
      },
    });

    const statsByOrganisme = organismes.map((org) => {
      const totalDistance = org.parcours.reduce((acc, p) => acc + (p.distanceKm || 0), 0);
      const totalParticipants = org.parcours.reduce((acc, p) => acc + p._count.usersStats, 0);

      return {
        id: org.id,
        nom: org.nom,
        nbParcours: org.parcours.length,
        totalDistanceKm: Number(totalDistance.toFixed(2)),
        totalParticipants,
      };
    });

    // 3. Stats par Zonage
    const zonages = await this.db.zonage.findMany({
      include: {
        _count: {
          select: { parcours: { where: parcoursFilter } },
        },
      },
    });

    return {
      global: {
        totalParcours,
        totalUsers,
        totalObservations,
        totalCompletions,
      },
      byOrganisme: statsByOrganisme,
      byZonage: zonages.map(z => ({
        id: z.id,
        nom: z.nom,
        nbParcours: z._count.parcours,
      })),
    };
  }

  async exportCsv(role: Role, organismeId: string | null) {
    const isSuperAdmin = role === Role.SUPER_ADMIN;
    const parcoursFilter = isSuperAdmin ? {} : { organismeId: organismeId! };

    // Génère un CSV des parcours pour export
    const parcoursList = await this.db.parcours.findMany({
      where: parcoursFilter,
      include: {
        organisme: true,
        zonage: true,
        _count: {
          select: { etapes: true, usersStats: true, reviews: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    let csv = "ID,Titre,Statut,Difficulté,Distance (km),Durée (min),Organisme,Zonage,Nb Étapes,Nb Participants,Nb Avis\n";

    for (const p of parcoursList) {
      const row = [
        p.id,
        `"${p.title.replace(/"/g, '""')}"`,
        p.status,
        p.difficulty,
        p.distanceKm,
        p.durationMin,
        `"${p.organisme?.nom || ''}"`,
        `"${p.zonage?.nom || ''}"`,
        p._count.etapes,
        p._count.usersStats,
        p._count.reviews,
      ];
      csv += row.join(',') + "\n";
    }

    return csv;
  }
}
