import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import { SearchParcoursDto } from './dto/search-parcours.dto';
import { PublishStatus } from '@prisma/client';

@Injectable()
export class MobileService {
  constructor(private readonly db: DatabaseService) {}

  /**
   * Recherche de parcours depuis l'app mobile.
   * - Uniquement les parcours PUBLISHED
   * - Filtres : communeId, accessibilité (PMR, enfants, handicap mental)
   * - Réponse allégée (pas des étapes, jeux, etc.) pour minimiser la bande passante
   */
  async searchParcours(filters: SearchParcoursDto) {
    const where: any = {
      status: PublishStatus.PUBLISHED,
    };

    if (filters.communeId) {
      where.communeId = filters.communeId;
    }

    if (filters.isPMRFriendly === true) {
      where.isPMRFriendly = true;
    }

    if (filters.isChildFriendly === true) {
      where.isChildFriendly = true;
    }

    if (filters.isMentalHandicapFriendly === true) {
      where.isMentalHandicapFriendly = true;
    }

    return this.db.parcours.findMany({
      where,
      select: {
        id: true,
        title: true,
        description: true,
        difficulty: true,
        distanceKm: true,
        durationMin: true,
        coverImage: true,
        mascotteNom: true,
        mascotteImg: true,
        isPMRFriendly: true,
        isChildFriendly: true,
        isMentalHandicapFriendly: true,
        commune: {
          select: { id: true, nom: true, codePostal: true },
        },
        agence: {
          select: { id: true, nom: true },
        },
        _count: {
          select: { etapes: true, reviews: true },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });
  }
}
