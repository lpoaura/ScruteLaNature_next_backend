import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import { SearchParcoursDto } from './dto/search-parcours.dto';
import { NearbyParcoursDto } from './dto/nearby-parcours.dto';
import { SyncMobileDto } from './dto/sync-mobile.dto';
import { PublishStatus } from '@prisma/client';

@Injectable()
export class MobileService {
  private readonly logger = new Logger(MobileService.name);

  constructor(private readonly db: DatabaseService) {}

  /**
   * Tâche 4.1 — Route de Synchronisation Hors-Ligne
   * POST /mobile/sync
   *
   * Principe d'idempotence : si un syncId est déjà connu en base,
   * on l'ignore silencieusement (évite les doubles insertions en cas
   * de coupure réseau au moment de la confirmation).
   */
  async syncMobileData(userId: string, dto: SyncMobileDto) {
    const results = {
      parcoursCompleted: { synced: 0, skipped: 0 },
      errors: [] as { syncId: string; reason: string }[],
    };

    // ── 1. Traitement des parcours terminés ──────────────────────────────────
    if (dto.parcoursCompleted && dto.parcoursCompleted.length > 0) {
      for (const event of dto.parcoursCompleted) {
        // Vérification idempotence via syncId
        const existing = await this.db.userParcours.findUnique({
          where: { syncId: event.syncId },
        });

        if (existing) {
          this.logger.log(`[SYNC] syncId déjà traité, ignoré: ${event.syncId}`);
          results.parcoursCompleted.skipped++;
          continue;
        }

        try {
          await this.db.$transaction(async (tx) => {
            // Vérifier si c'est un premier passage ou une mise à jour (parcours déjà fait en ligne)
            const alreadyDoneInline = await tx.userParcours.findUnique({
              where: { userId_parcoursId: { userId, parcoursId: event.parcoursId } },
              select: { id: true, score: true },
            });

            if (alreadyDoneInline) {
              // Mise à jour uniquement si le nouveau score est meilleur
              if (event.score > alreadyDoneInline.score) {
                const scoreDiff = event.score - alreadyDoneInline.score;
                await tx.userParcours.update({
                  where: { userId_parcoursId: { userId, parcoursId: event.parcoursId } },
                  data: {
                    syncId: event.syncId,
                    score: event.score,
                    completedAt: new Date(event.completedAt),
                  },
                });
                // Incrémenter seulement la différence pour éviter le double-comptage
                await tx.user.update({
                  where: { id: userId },
                  data: {
                    totalPoints: { increment: scoreDiff },
                    co2Saved: { increment: event.co2Saved ?? 0 },
                  },
                });
              } else {
                // Score inférieur ou égal : on enregistre juste le syncId pour l'idempotence
                await tx.userParcours.update({
                  where: { userId_parcoursId: { userId, parcoursId: event.parcoursId } },
                  data: { syncId: event.syncId },
                });
              }
            } else {
              // Première fois que ce parcours est complété
              await tx.userParcours.create({
                data: {
                  syncId: event.syncId,
                  userId,
                  parcoursId: event.parcoursId,
                  score: event.score,
                  completedAt: new Date(event.completedAt),
                },
              });
              await tx.user.update({
                where: { id: userId },
                data: {
                  totalPoints: { increment: event.score },
                  co2Saved: { increment: event.co2Saved ?? 0 },
                },
              });
              
              // Attribution du badge si le parcours en a un
              const parcours = await tx.parcours.findUnique({ where: { id: event.parcoursId } });
              if (parcours?.badgeId) {
                await tx.userBadge.upsert({
                  where: { userId_badgeId: { userId, badgeId: parcours.badgeId } },
                  create: { userId, badgeId: parcours.badgeId },
                  update: {},
                });
              }
            }
            
            // Recalculer le niveau (incrémentation et remise à zéro des points)
            const updatedUser = await tx.user.findUnique({ where: { id: userId } });
            if (updatedUser && updatedUser.totalPoints >= 1000) {
              const levelsGained = Math.floor(updatedUser.totalPoints / 1000);
              const remainingPoints = updatedUser.totalPoints % 1000;
              
              await tx.user.update({
                where: { id: userId },
                data: { 
                  level: updatedUser.level + levelsGained,
                  totalPoints: remainingPoints
                },
              });
            }
          });

          results.parcoursCompleted.synced++;
        } catch (err) {
          this.logger.error(`[SYNC] Erreur parcours ${event.parcoursId}:`, err.message);
          results.errors.push({ syncId: event.syncId, reason: err.message });
        }
      }
    }

    // NOTE : La synchronisation des observations (photos terrain) est volontairement
    // désactivée en attente de confirmation du budget de stockage cloud.
    // Pour réactiver :
    //   1. Ajouter ObservationEventDto + le champ observations[] dans SyncMobileDto
    //   2. Décommenter le bloc ci-dessous
    //
    // if (dto.observations && dto.observations.length > 0) {
    //   for (const obs of dto.observations) {
    //     const existing = await this.db.observation.findUnique({ where: { syncId: obs.syncId } });
    //     if (existing) { results.observations.skipped++; continue; }
    //     try {
    //       await this.db.observation.create({ data: { ...obs, userId, isOfflineSync: true, createdAt: new Date(obs.timestamp) } });
    //       results.observations.synced++;
    //     } catch (err) { results.errors.push({ syncId: obs.syncId, reason: err.message }); }
    //   }
    // }

    return {
      success: results.errors.length === 0,
      message: results.errors.length === 0
        ? 'Synchronisation complète.'
        : `Synchronisation partielle : ${results.errors.length} événement(s) en erreur.`,
      results,
    };
  }





  /**
   * Recherche de parcours depuis l'app mobile.
   * - Uniquement les parcours PUBLISHED
   * - Filtres : zonageId, accessibilité (PMR, enfants, handicap mental)
   * - Réponse allégée (pas des étapes, jeux, etc.) pour minimiser la bande passante
   */
  async searchParcours(filters: SearchParcoursDto) {
    const where: any = {
      status: PublishStatus.PUBLISHED,
    };

    if (filters.zonageId) {
      where.zonageId = filters.zonageId;
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
        isPMRFriendly: true,
        isChildFriendly: true,
        isMentalHandicapFriendly: true,
        isEscapeGame: true,
        badge: true,
        zonage: {
          select: { id: true, nom: true, code: true },
        },
        organisme: {
          select: { id: true, nom: true },
        },
        etapes: {
          orderBy: { order: 'asc' },
          take: 1, // Prendre uniquement la première étape pour les coordonnées de départ
          select: { latitude: true, longitude: true },
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
   * tous ses jeux, son organisme et sa zonage, prêt à être téléchargé
   * pour le mode hors-ligne de l'application mobile.
   */
  async downloadParcours(id: string, isPreview = false, userId?: string, logDownload = true) {
    const parcours = await this.db.parcours.findFirst({
      where: {
        id,
        ...(isPreview ? {} : { status: PublishStatus.PUBLISHED }),
      },
      include: {
        badge: true,
        organisme: {
          select: { id: true, nom: true },
        },
        zonage: {
          select: { id: true, nom: true, code: true },
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

    // Filtrer les étapes vides pour ne pas faire crasher l'application mobile
    // si un Super Admin ajoute une étape sans la remplir sur un parcours déjà publié.
    if (parcours.etapes) {
      parcours.etapes = parcours.etapes.filter((etape) => etape.jeux && etape.jeux.length > 0);
    }

    // Tracker le téléchargement pour les statistiques (si pas en prévisualisation et si demandé)
    if (!isPreview && logDownload) {
      // On log le download en asynchrone pour ne pas ralentir la réponse
      this.db.parcoursDownload.create({
        data: {
          parcoursId: parcours.id,
          userId: userId || null,
        },
      }).catch(err => this.logger.error(`[STATS] Erreur log download parcours ${id}:`, err.message));
    }

    // Le backend renvoie tel quel. 
    // Les URLs (coverImage, imageUrl, audioUrl) sont généralement déjà absolues 
    // dans la base (car générées par MediasService à l'upload).
    return parcours;
  }

  /**
   * Récupère la liste de tous les badges du jeu pour affichage côté mobile
   */
  async getBadges() {
    return this.db.badge.findMany({
      where: {
        parcours: {
          some: {
            status: PublishStatus.PUBLISHED,
          },
        },
      },
      include: {
        parcours: {
          where: { status: PublishStatus.PUBLISHED },
          select: { id: true },
          take: 1,
        }
      },
      orderBy: { name: 'asc' },
    });
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
        ...(dto.isCoupDeCoeur ? { isCoupDeCoeur: true } : {}),
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
        isCoupDeCoeur: true,
        isEscapeGame: true,
        badge: true,
        zonage: { select: { nom: true } },
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

  async getActiveAnecdotes() {
    return this.db.anecdote.findMany({
      where: { isActive: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getCommunityFeed(parcoursId?: string) {
    return this.db.review.findMany({
      take: 100,
      where: parcoursId ? { parcoursId } : undefined,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        rating: true,
        comment: true,
        createdAt: true,
        user: {
          select: {
            pseudo: true,
          }
        },
        parcours: {
          select: {
            title: true,
            zonage: {
              select: {
                nom: true,
              }
            }
          }
        }
      }
    });
  }
}
