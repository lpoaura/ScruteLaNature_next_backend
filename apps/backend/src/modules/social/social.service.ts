import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import { FriendshipStatus, Role } from '@prisma/client';
import { SendFriendRequestDto } from './dto/send-friend-request.dto';
import { CreateReviewDto } from './dto/create-review.dto';
import { NotificationsService } from '../notifications/notifications.service';

// Projection minimale pour ne jamais exposer de données sensibles (email, password, etc.)
const PUBLIC_USER_SELECT = {
  id: true,
  pseudo: true,
  firstName: true,
  level: true,
  totalPoints: true,
};

@Injectable()
export class SocialService {
  constructor(
    private readonly db: DatabaseService,
    private readonly notificationsService: NotificationsService,
  ) {}

  // ── 0. Rechercher un utilisateur ──────────────────────────────────────────
  
  async searchUsers(currentUserId: string, query: string) {
    if (!query || query.length < 2) return [];
    
    return this.db.user.findMany({
      where: {
        pseudo: {
          contains: query,
          mode: 'insensitive',
        },
        // Exclure l'utilisateur courant et les invités
        id: { not: currentUserId },
        isGuest: false,
      },
      select: {
        id: true,
        pseudo: true,
      },
      take: 10,
    });
  }

  // ── 1. Envoyer une demande d'ami ──────────────────────────────────────────

  async sendFriendRequest(requesterId: string, dto: SendFriendRequestDto) {
    // Trouver le destinataire par son pseudo
    const receiver = await this.db.user.findUnique({
      where: { pseudo: dto.pseudo },
      select: { id: true, pseudo: true, isGuest: true },
    });

    if (!receiver) {
      throw new NotFoundException(`Aucun joueur avec le pseudo "${dto.pseudo}" n'existe.`);
    }

    // On ne peut pas s'envoyer une demande à soi-même
    if (receiver.id === requesterId) {
      throw new BadRequestException('Vous ne pouvez pas vous ajouter vous-même.');
    }

    // Les comptes invités ne peuvent pas avoir d'amis
    if (receiver.isGuest) {
      throw new BadRequestException('Ce joueur est un compte invité, il ne peut pas avoir d\'amis.');
    }

    // Vérifier si une relation existe déjà (dans les deux sens)
    const existing = await this.db.friendship.findFirst({
      where: {
        OR: [
          { requesterId, receiverId: receiver.id },
          { requesterId: receiver.id, receiverId: requesterId },
        ],
      },
    });

    if (existing) {
      if (existing.status === FriendshipStatus.ACCEPTED) {
        throw new ConflictException('Vous êtes déjà amis avec ce joueur.');
      }
      if (existing.status === FriendshipStatus.PENDING) {
        throw new ConflictException('Une demande est déjà en attente avec ce joueur.');
      }
      if (existing.status === FriendshipStatus.BLOCKED) {
        throw new ForbiddenException('Cette relation est bloquée.');
      }
    }

    const friendship = await this.db.friendship.create({
      data: {
        requesterId,
        receiverId: receiver.id,
        status: FriendshipStatus.PENDING,
      },
      include: {
        receiver: { select: PUBLIC_USER_SELECT },
        requester: { select: PUBLIC_USER_SELECT },
      },
    });

    // Envoyer une notification Push au destinataire
    if (friendship.requester) {
      this.notificationsService.sendPushNotifications(
        [receiver.id],
        "Nouvelle demande d'ami",
        `${friendship.requester.pseudo} veut devenir votre ami !`,
        { type: 'FRIEND_REQUEST', friendshipId: friendship.id }
      ).catch(err => console.error('Erreur notification push:', err));
    }

    return {
      message: `Demande d'ami envoyée à ${receiver.pseudo} !`,
      friendship,
    };
  }

  // ── 2. Lister les demandes reçues (PENDING) ──────────────────────────────

  async getPendingRequests(userId: string) {
    return this.db.friendship.findMany({
      where: {
        receiverId: userId,
        status: FriendshipStatus.PENDING,
      },
      include: {
        requester: { select: PUBLIC_USER_SELECT },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  // ── 3. Lister ses amis (ACCEPTED) ────────────────────────────────────────

  async getFriends(userId: string) {
    const friendships = await this.db.friendship.findMany({
      where: {
        OR: [
          { requesterId: userId, status: FriendshipStatus.ACCEPTED },
          { receiverId: userId, status: FriendshipStatus.ACCEPTED },
        ],
      },
      include: {
        requester: { select: PUBLIC_USER_SELECT },
        receiver: { select: PUBLIC_USER_SELECT },
      },
      orderBy: { updatedAt: 'desc' },
    });

    // Normaliser la réponse : toujours renvoyer "l'autre" utilisateur
    return friendships.map((f) => ({
      friendshipId: f.id,
      friend: f.requesterId === userId ? f.receiver : f.requester,
      since: f.updatedAt,
    }));
  }

  // ── 4. Accepter une demande ───────────────────────────────────────────────

  async acceptFriendRequest(friendshipId: string, userId: string) {
    const friendship = await this.db.friendship.findUnique({
      where: { id: friendshipId },
    });

    if (!friendship) {
      throw new NotFoundException('Demande introuvable.');
    }

    // Seul le destinataire peut accepter
    if (friendship.receiverId !== userId) {
      throw new ForbiddenException('Seul le destinataire peut accepter cette demande.');
    }

    if (friendship.status !== FriendshipStatus.PENDING) {
      throw new BadRequestException(`Impossible d'accepter une demande au statut "${friendship.status}".`);
    }

    const updated = await this.db.friendship.update({
      where: { id: friendshipId },
      data: { status: FriendshipStatus.ACCEPTED },
      include: {
        requester: { select: PUBLIC_USER_SELECT },
        receiver: { select: PUBLIC_USER_SELECT },
      },
    });

    // Envoyer une notification Push au demandeur (requester)
    if (updated.receiver) {
      this.notificationsService.sendPushNotifications(
        [updated.requesterId],
        "Demande d'ami acceptée",
        `${updated.receiver.pseudo} a accepté votre demande.`,
        { type: 'FRIEND_ACCEPT', friendshipId: updated.id }
      ).catch(err => console.error('Erreur notification push:', err));
    }

    return updated;
  }

  // ── 5. Bloquer quelqu'un ─────────────────────────────────────────────────

  async blockUser(friendshipId: string, userId: string) {
    const friendship = await this.db.friendship.findUnique({
      where: { id: friendshipId },
    });

    if (!friendship) {
      throw new NotFoundException('Relation introuvable.');
    }

    // Les deux parties peuvent bloquer
    if (friendship.requesterId !== userId && friendship.receiverId !== userId) {
      throw new ForbiddenException('Vous ne faites pas partie de cette relation.');
    }

    return this.db.friendship.update({
      where: { id: friendshipId },
      data: { status: FriendshipStatus.BLOCKED },
    });
  }

  // ── 6. Supprimer un ami / Refuser une demande ────────────────────────────

  async removeFriendship(friendshipId: string, userId: string) {
    const friendship = await this.db.friendship.findUnique({
      where: { id: friendshipId },
    });

    if (!friendship) {
      throw new NotFoundException('Relation introuvable.');
    }

    if (friendship.requesterId !== userId && friendship.receiverId !== userId) {
      throw new ForbiddenException('Vous ne faites pas partie de cette relation.');
    }

    await this.db.friendship.delete({ where: { id: friendshipId } });
    return { message: 'Relation supprimée.' };
  }

  // ══════════════════════════════════════════════════════════════════════════
  // INVITATIONS DE PARCOURS
  // ══════════════════════════════════════════════════════════════════════════

  async sendParcoursInvitation(senderId: string, dto: { receiverId: string, parcoursId: string }) {
    const receiver = await this.db.user.findUnique({
      where: { id: dto.receiverId },
    });

    if (!receiver || receiver.isGuest) {
      throw new BadRequestException('Impossible d\'inviter cet utilisateur.');
    }

    const existing = await this.db.parcoursInvitation.findFirst({
      where: {
        senderId,
        receiverId: dto.receiverId,
        parcoursId: dto.parcoursId,
        status: FriendshipStatus.PENDING,
      },
    });

    if (existing) {
      throw new ConflictException('Une invitation est déjà en attente pour ce parcours et cet ami.');
    }

    const invitation = await this.db.parcoursInvitation.create({
      data: {
        senderId,
        receiverId: dto.receiverId,
        parcoursId: dto.parcoursId,
        status: FriendshipStatus.PENDING,
      },
      include: {
        parcours: { select: { id: true, title: true, coverImage: true, distanceKm: true, durationMin: true } },
      },
    });

    return invitation;
  }

  async getReceivedInvitations(userId: string) {
    return this.db.parcoursInvitation.findMany({
      where: {
        receiverId: userId,
        status: FriendshipStatus.PENDING,
      },
      include: {
        sender: { select: PUBLIC_USER_SELECT },
        parcours: { select: { id: true, title: true, coverImage: true, distanceKm: true, durationMin: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async respondToInvitation(invitationId: string, userId: string, accept: boolean) {
    const invitation = await this.db.parcoursInvitation.findUnique({
      where: { id: invitationId },
    });

    if (!invitation || invitation.receiverId !== userId) {
      throw new NotFoundException('Invitation introuvable.');
    }

    if (accept) {
      return this.db.parcoursInvitation.update({
        where: { id: invitationId },
        data: { status: FriendshipStatus.ACCEPTED },
      });
    } else {
      await this.db.parcoursInvitation.delete({
        where: { id: invitationId },
      });
      return { message: 'Invitation supprimée.' };
    }
  }

  // ══════════════════════════════════════════════════════════════════════════
  // AVIS & NOTES (Reviews) — Tâche 4.3
  // ══════════════════════════════════════════════════════════════════════════

  // ── 7. Laisser un avis sur un parcours ────────────────────────────────────

  async createReview(userId: string, dto: CreateReviewDto) {
    // Le parcours doit exister et être PUBLISHED
    const parcours = await this.db.parcours.findUnique({
      where: { id: dto.parcoursId },
      select: { id: true, title: true, status: true },
    });

    if (!parcours) {
      throw new NotFoundException(`Parcours introuvable.`);
    }

    if (parcours.status !== 'PUBLISHED') {
      throw new BadRequestException('Vous ne pouvez noter que des parcours publiés.');
    }

    // Un joueur ne peut laisser qu'un seul avis par parcours (@@unique dans le schema)
    const existing = await this.db.review.findUnique({
      where: { userId_parcoursId: { userId, parcoursId: dto.parcoursId } },
    });

    if (existing) {
      throw new ConflictException('Vous avez déjà laissé un avis pour ce parcours.');
    }

    const review = await this.db.review.create({
      data: {
        userId,
        parcoursId: dto.parcoursId,
        rating: dto.rating,
        comment: dto.comment,
      },
      include: {
        user: { select: { id: true, pseudo: true, firstName: true } },
      },
    });

    return review;
  }

  // ── 8. Lister les avis d'un parcours (public) ────────────────────────────

  async getReviewsByParcours(parcoursId: string) {
    const [reviews, aggregate] = await Promise.all([
      this.db.review.findMany({
        where: { parcoursId },
        include: {
          user: { select: { id: true, pseudo: true, firstName: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.db.review.aggregate({
        where: { parcoursId },
        _avg: { rating: true },
        _count: { rating: true },
      }),
    ]);

    return {
      averageRating: aggregate._avg.rating
        ? Math.round(aggregate._avg.rating * 10) / 10
        : null,
      totalReviews: aggregate._count.rating,
      reviews,
    };
  }

  // ── 9. Lister tous les avis (modération admin) ───────────────────────────

  async getAllReviews(userRole: Role, organismeId: string | null, page = 1, limit = 20, rating?: number, sortOrder: 'asc' | 'desc' = 'desc') {
    const isSuperAdmin = userRole === Role.SUPER_ADMIN;
    const baseWhere: any = isSuperAdmin ? {} : { parcours: { organismeId: organismeId! } };
    
    const where = { ...baseWhere };
    if (rating) {
      where.rating = rating;
    }

    const skip = (page - 1) * limit;

    const [data, total, agg] = await Promise.all([
      this.db.review.findMany({
        where,
        include: {
          user: { select: { id: true, pseudo: true, email: true } },
          parcours: { select: { id: true, title: true, organismeId: true } },
        },
        orderBy: { createdAt: sortOrder },
        skip,
        take: limit,
      }),
      this.db.review.count({ where }),
      this.db.review.groupBy({
        by: ['rating'],
        where: baseWhere,
        _count: true,
      })
    ]);

    const totalReviews = agg.reduce((acc, curr) => acc + curr._count, 0);
    const avgRating = totalReviews ? (agg.reduce((acc, curr) => acc + (curr.rating * curr._count), 0) / totalReviews) : null;
    const count5 = agg.find(a => a.rating === 5)?._count || 0;
    const count1 = agg.find(a => a.rating === 1)?._count || 0;

    return {
      data,
      meta: { 
        total, 
        page, 
        limit, 
        totalPages: Math.ceil(total / limit),
        kpis: {
          total: totalReviews,
          avgRating: avgRating ? Math.round(avgRating * 10) / 10 : null,
          count5,
          count1
        }
      },
    };
  }

  // ── 10. Supprimer un avis (auteur ou modérateur ADMIN/SUPER_ADMIN) ────────

  async deleteReview(reviewId: string, userId: string, userRole: Role) {
    const review = await this.db.review.findUnique({
      where: { id: reviewId },
    });

    if (!review) {
      throw new NotFoundException('Avis introuvable.');
    }

    const isAdmin = userRole === Role.EDITOR || userRole === Role.ADMIN || userRole === Role.SUPER_ADMIN;
    const isOwner = review.userId === userId;

    if (!isOwner && !isAdmin) {
      throw new ForbiddenException('Vous ne pouvez supprimer que vos propres avis.');
    }

    await this.db.review.delete({ where: { id: reviewId } });
    return { message: 'Avis supprimé.' };
  }
}
