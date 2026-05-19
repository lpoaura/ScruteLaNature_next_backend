import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import { Role } from '@prisma/client';

@Injectable()
export class StatsService {
  constructor(private readonly db: DatabaseService) {}

  async getDashboardStats(
    role: Role,
    organismeId: string | null,
    filterOrganismeId?: string,
    filterZonageId?: string,
    startDate?: string,
    endDate?: string,
  ) {
    const isSuperAdmin = role === Role.SUPER_ADMIN;
    const baseFilter = isSuperAdmin ? {} : { organismeId: organismeId! };
    const parcoursFilter: any = { ...baseFilter };
    if (filterOrganismeId) parcoursFilter.organismeId = filterOrganismeId;
    if (filterZonageId) parcoursFilter.zonageId = filterZonageId;
    if (startDate || endDate) {
      parcoursFilter.createdAt = {
        ...(startDate ? { gte: new Date(startDate) } : {}),
        ...(endDate ? { lte: new Date(endDate + 'T23:59:59.999Z') } : {}),
      };
    }
    // 1. Chiffres globaux
    const totalParcours = await this.db.parcours.count({ where: parcoursFilter });

    // Résoudre les IDs de parcours correspondants (évite distinct+relation nested instable)
    const isFiltered = !!(filterOrganismeId || filterZonageId || startDate || endDate);
    const noScope = isSuperAdmin && !isFiltered;

    const parcoursIds: string[] = noScope
      ? []
      : (await this.db.parcours.findMany({ where: parcoursFilter, select: { id: true } })).map(p => p.id);

    const upWhere = noScope ? undefined : { parcoursId: { in: parcoursIds } };

    // Joueurs distincts ayant joué les parcours concernés
    const totalPlayers = noScope
      ? await this.db.user.count({ where: { role: Role.USER, isGuest: false } })
      : await this.db.userParcours
          .groupBy({ by: ['userId'], where: upWhere })
          .then((r) => r.length);

    // Membres staff
    const membersWhere: any = isSuperAdmin
      ? { role: { in: [Role.EDITOR, Role.ADMIN, Role.SUPER_ADMIN] } }
      : { role: { in: [Role.EDITOR, Role.ADMIN] }, organismeId: organismeId! };
    if (filterOrganismeId) membersWhere.organismeId = filterOrganismeId;
    const totalMembers = await this.db.user.count({ where: membersWhere });

    const totalCompletions = await this.db.userParcours.count({ where: upWhere });

    // 2. Tableau croisé dynamique des organismes
    const orgWhere = filterOrganismeId
      ? { id: filterOrganismeId }
      : isSuperAdmin ? undefined : { id: organismeId! };

    // Filtre sur les parcours inclus (date/zonage uniquement — organismeId est implicite via la relation)
    const parcoursIncludeWhere: any = {};
    if (filterZonageId) parcoursIncludeWhere.zonageId = filterZonageId;
    if (startDate || endDate) {
      parcoursIncludeWhere.createdAt = {
        ...(startDate ? { gte: new Date(startDate) } : {}),
        ...(endDate ? { lte: new Date(endDate + 'T23:59:59.999Z') } : {}),
      };
    }
    const hasParcoursIncludeFilter = Object.keys(parcoursIncludeWhere).length > 0;

    const organismes = await this.db.organisme.findMany({
      where: orgWhere,
      include: {
        parcours: {
          where: hasParcoursIncludeFilter ? parcoursIncludeWhere : undefined,
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
      where: filterZonageId ? { id: filterZonageId } : undefined,
      include: {
        _count: {
          select: { parcours: { where: parcoursFilter } },
        },
      },
    });

    return {
      global: {
        totalParcours,
        totalPlayers,
        totalMembers,
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

  async exportCsv(
    role: Role,
    userOrganismeId: string | null,
    filterOrganismeId?: string,
    filterZonageId?: string,
  ) {
    const isSuperAdmin = role === Role.SUPER_ADMIN;
    const baseFilter = isSuperAdmin ? {} : { organismeId: userOrganismeId! };
    const parcoursFilter: any = { ...baseFilter };
    if (filterOrganismeId) parcoursFilter.organismeId = filterOrganismeId;
    if (filterZonageId) parcoursFilter.zonageId = filterZonageId;

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
