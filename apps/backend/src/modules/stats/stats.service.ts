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

    const isFiltered = !!(filterOrganismeId || filterZonageId || startDate || endDate);
    const noScope = isSuperAdmin && !isFiltered;

    const parcoursIds: string[] = noScope
      ? []
      : (await this.db.parcours.findMany({ where: parcoursFilter, select: { id: true } })).map(p => p.id);

    const upWhere = noScope ? undefined : { parcoursId: { in: parcoursIds } };

    const totalPlayers = noScope
      ? await this.db.user.count({ where: { role: Role.USER, isGuest: false } })
      : await this.db.userParcours
          .groupBy({ by: ['userId'], where: upWhere })
          .then((r) => r.length);

    const membersWhere: any = isSuperAdmin
      ? { role: { in: [Role.EDITOR, Role.ADMIN, Role.SUPER_ADMIN] } }
      : { role: { in: [Role.EDITOR, Role.ADMIN] }, organismeId: organismeId! };
    if (filterOrganismeId) membersWhere.organismeId = filterOrganismeId;
    const totalMembers = await this.db.user.count({ where: membersWhere });

    const totalCompletions = await this.db.userParcours.count({ where: upWhere });

    // 2. Tableau croisé organismes
    const orgWhere = filterOrganismeId
      ? { id: filterOrganismeId }
      : isSuperAdmin ? undefined : { id: organismeId! };

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
            _count: { select: { usersStats: true } },
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
        _count: { select: { parcours: { where: parcoursFilter } } },
      },
    });

    // 4. ── Activité par parcours (downloads + parties jouées) ──────────────────
    const now = new Date();

    // Début du mois en cours
    const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // Début d'il y a 2 mois
    const startOf2MonthsAgo = new Date(now.getFullYear(), now.getMonth() - 2, 1);

    // On ne récupère que les parcours publiés visibles par l'utilisateur
    const parcoursForActivity = await this.db.parcours.findMany({
      where: parcoursFilter,
      select: {
        id: true,
        title: true,
        coverImage: true,
        organisme: { select: { nom: true } },
        _count: {
          select: {
            usersStats: true,   // total parties
            downloads: true,    // total téléchargements
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
      take: 50, // On limite pour ne pas surcharger
    });

    const parcourActivityIds = parcoursForActivity.map(p => p.id);

    // Téléchargements ce mois
    const dlThisMonthRaw = await this.db.parcoursDownload.groupBy({
      by: ['parcoursId'],
      where: {
        parcoursId: { in: parcourActivityIds },
        downloadedAt: { gte: startOfThisMonth },
      },
      _count: { parcoursId: true },
    });

    // Téléchargements 2 derniers mois
    const dl2MonthsRaw = await this.db.parcoursDownload.groupBy({
      by: ['parcoursId'],
      where: {
        parcoursId: { in: parcourActivityIds },
        downloadedAt: { gte: startOf2MonthsAgo },
      },
      _count: { parcoursId: true },
    });

    // Parties ce mois
    const playsThisMonthRaw = await this.db.userParcours.groupBy({
      by: ['parcoursId'],
      where: {
        parcoursId: { in: parcourActivityIds },
        completedAt: { gte: startOfThisMonth },
      },
      _count: { parcoursId: true },
    });

    // Parties 2 derniers mois
    const plays2MonthsRaw = await this.db.userParcours.groupBy({
      by: ['parcoursId'],
      where: {
        parcoursId: { in: parcourActivityIds },
        completedAt: { gte: startOf2MonthsAgo },
      },
      _count: { parcoursId: true },
    });

    // Indexation rapide par parcoursId
    const idx = <T extends { parcoursId: string; _count: { parcoursId: number } }>(arr: T[]) =>
      Object.fromEntries(arr.map(r => [r.parcoursId, r._count.parcoursId]));

    const dlThisMonth   = idx(dlThisMonthRaw);
    const dl2Months     = idx(dl2MonthsRaw);
    const playsThisMonth = idx(playsThisMonthRaw);
    const plays2Months   = idx(plays2MonthsRaw);

    const byParcours = parcoursForActivity.map(p => ({
      id:           p.id,
      title:        p.title,
      coverImage:   p.coverImage,
      organisme:    p.organisme?.nom ?? null,
      downloads: {
        thisMonth:  dlThisMonth[p.id]  ?? 0,
        last2Months: dl2Months[p.id]   ?? 0,
        total:       p._count.downloads,
      },
      plays: {
        thisMonth:  playsThisMonth[p.id]  ?? 0,
        last2Months: plays2Months[p.id]   ?? 0,
        total:       p._count.usersStats,
      },
    }));

    return {
      global: { totalParcours, totalPlayers, totalMembers, totalCompletions },
      byOrganisme: statsByOrganisme,
      byZonage: zonages.map(z => ({ id: z.id, nom: z.nom, nbParcours: z._count.parcours })),
      byParcours,
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

    const now = new Date();
    const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOf2MonthsAgo = new Date(now.getFullYear(), now.getMonth() - 2, 1);

    const parcoursList = await this.db.parcours.findMany({
      where: parcoursFilter,
      include: {
        organisme: true,
        zonage: true,
        _count: { select: { etapes: true, usersStats: true, reviews: true, downloads: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Téléchargements ce mois et 2 derniers mois par parcours
    const parcoursIds = parcoursList.map(p => p.id);

    const [dlThisMonthRaw, dl2MonthsRaw, playsThisMonthRaw, plays2MonthsRaw] = await Promise.all([
      this.db.parcoursDownload.groupBy({
        by: ['parcoursId'],
        where: { parcoursId: { in: parcoursIds }, downloadedAt: { gte: startOfThisMonth } },
        _count: { parcoursId: true },
      }),
      this.db.parcoursDownload.groupBy({
        by: ['parcoursId'],
        where: { parcoursId: { in: parcoursIds }, downloadedAt: { gte: startOf2MonthsAgo } },
        _count: { parcoursId: true },
      }),
      this.db.userParcours.groupBy({
        by: ['parcoursId'],
        where: { parcoursId: { in: parcoursIds }, completedAt: { gte: startOfThisMonth } },
        _count: { parcoursId: true },
      }),
      this.db.userParcours.groupBy({
        by: ['parcoursId'],
        where: { parcoursId: { in: parcoursIds }, completedAt: { gte: startOf2MonthsAgo } },
        _count: { parcoursId: true },
      }),
    ]);

    const idx = <T extends { parcoursId: string; _count: { parcoursId: number } }>(arr: T[]) =>
      Object.fromEntries(arr.map(r => [r.parcoursId, r._count.parcoursId]));

    const dlThisMonth = idx(dlThisMonthRaw);
    const dl2Months   = idx(dl2MonthsRaw);
    const playsThisMonth = idx(playsThisMonthRaw);
    const plays2Months   = idx(plays2MonthsRaw);

    let csv = 'ID,Titre,Statut,Difficulté,Distance (km),Durée (min),Organisme,Zonage,Nb Étapes,Nb Téléch. (mois),Nb Téléch. (2 mois),Nb Téléch. (total),Nb Parties (mois),Nb Parties (2 mois),Nb Parties (total),Nb Avis\n';

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
        dlThisMonth[p.id] ?? 0,
        dl2Months[p.id] ?? 0,
        p._count.downloads,
        playsThisMonth[p.id] ?? 0,
        plays2Months[p.id] ?? 0,
        p._count.usersStats,
        p._count.reviews,
      ];
      csv += row.join(',') + '\n';
    }

    return csv;
  }
}
