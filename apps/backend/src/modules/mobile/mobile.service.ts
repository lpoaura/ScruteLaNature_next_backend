import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import { SearchParcoursDto } from './dto/search-parcours.dto';
import { NearbyParcoursDto } from './dto/nearby-parcours.dto';
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

  /**
   * Chantier Critique (Tâche 3.3) : Mega-Export Mobile
   * Récupère un parcours PUBLISHED complet avec toutes ses étapes,
   * tous ses jeux, son agence et sa commune, prêt à être téléchargé
   * pour le mode hors-ligne de l'application mobile.
   */
  async downloadParcours(id: string) {
    const parcours = await this.db.parcours.findFirst({
      where: {
        id,
        status: PublishStatus.PUBLISHED,
      },
      include: {
        agence: {
          select: { id: true, nom: true },
        },
        commune: {
          select: { id: true, nom: true, codePostal: true },
        },
        etapes: {
          orderBy: { order: 'asc' },
          include: {
            jeux: {
              orderBy: { order: 'asc' },
            },
          },
        },
      },
    });

    if (!parcours) {
      throw new NotFoundException('Parcours introuvable ou non publié');
    }

    // Le backend renvoie tel quel. 
    // Les URLs (coverImage, imageUrl, audioUrl) sont généralement déjà absolues 
    // dans la base (car générées par MediasService à l'upload).
    return parcours;
  }

  /**
   * Chantier 3.4 : API de recherche mobile GET /mobile/parcours/nearby
   * Calcul de distance basé sur la première étape de chaque parcours.
   */
  async getNearbyParcours(dto: NearbyParcoursDto) {
    const radius = dto.radiusKm || 50;

    // 1. Récupérer tous les parcours publiés avec leur première étape
    const parcoursList = await this.db.parcours.findMany({
      where: {
        status: PublishStatus.PUBLISHED,
      },
      select: {
        id: true,
        title: true,
        description: true,
        difficulty: true,
        distanceKm: true,
        durationMin: true,
        coverImage: true,
        isPMRFriendly: true,
        isChildFriendly: true,
        isMentalHandicapFriendly: true,
        commune: { select: { nom: true } },
        etapes: {
          orderBy: { order: 'asc' },
          take: 1, // Prendre uniquement la première étape (le départ)
          select: { latitude: true, longitude: true },
        },
      },
    });

    // 2. Filtrer et trier par distance en JavaScript (Haversine)
    const results = parcoursList
      .map((p) => {
        // S'il n'y a pas d'étape, on ignore (ne devrait pas arriver sur un parcours publié)
        if (!p.etapes || p.etapes.length === 0) return null;

        const firstEtape = p.etapes[0];
        const dist = this.calculateDistance(
          dto.latitude,
          dto.longitude,
          firstEtape.latitude,
          firstEtape.longitude,
        );

        return {
          ...p,
          distanceFromUserKm: Math.round(dist * 10) / 10, // Arrondi à 1 décimale
        };
      })
      .filter((p) => p !== null && p.distanceFromUserKm <= radius)
      .sort((a, b) => a!.distanceFromUserKm - b!.distanceFromUserKm);

    return results;
  }

  /**
   * Formule de Haversine pour calculer la distance entre deux points GPS en km
   */
  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Rayon de la Terre en km
    const dLat = this.deg2rad(lat2 - lat1);
    const dLon = this.deg2rad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.deg2rad(lat1)) *
        Math.cos(this.deg2rad(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private deg2rad(deg: number): number {
    return deg * (Math.PI / 180);
  }
}
