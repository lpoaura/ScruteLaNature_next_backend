import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import { FriendshipStatus } from '@prisma/client';
import { SendFriendRequestDto } from './dto/send-friend-request.dto';

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
  constructor(private readonly db: DatabaseService) {}

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
      },
    });

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

    return this.db.friendship.update({
      where: { id: friendshipId },
      data: { status: FriendshipStatus.ACCEPTED },
      include: {
        requester: { select: PUBLIC_USER_SELECT },
        receiver: { select: PUBLIC_USER_SELECT },
      },
    });
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
}
