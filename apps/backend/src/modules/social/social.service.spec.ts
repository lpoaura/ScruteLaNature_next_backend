import { Test, TestingModule } from '@nestjs/testing';
import { SocialService } from './social.service';
import { DatabaseService } from '../../database/database.service';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { FriendshipStatus, Role } from '@prisma/client';

const makeMockDb = () => ({
  user: {
    findUnique: jest.fn(),
  },
  friendship: {
    findFirst: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  parcours: {
    findUnique: jest.fn(),
  },
  review: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    delete: jest.fn(),
    aggregate: jest.fn(),
  },
});

describe('SocialService', () => {
  let service: SocialService;
  let db: ReturnType<typeof makeMockDb>;

  beforeEach(async () => {
    db = makeMockDb();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SocialService,
        { provide: DatabaseService, useValue: db },
      ],
    }).compile();
    service = module.get<SocialService>(SocialService);
  });

  afterEach(() => jest.clearAllMocks());

  // ── sendFriendRequest ────────────────────────────────────────────────────────

  describe('sendFriendRequest', () => {
    const requesterId = 'user-a';
    const dto = { pseudo: 'Ornitho42' };
    const receiver = { id: 'user-b', pseudo: 'Ornitho42', isGuest: false };

    it('devrait créer une demande PENDING si tout est valide', async () => {
      db.user.findUnique.mockResolvedValue(receiver);
      db.friendship.findFirst.mockResolvedValue(null);
      db.friendship.create.mockResolvedValue({ id: 'f1', status: FriendshipStatus.PENDING, receiver });

      const result = await service.sendFriendRequest(requesterId, dto);

      expect(db.friendship.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { requesterId, receiverId: receiver.id, status: FriendshipStatus.PENDING },
        }),
      );
      expect(result.friendship).toBeDefined();
    });

    it('devrait lever NotFoundException si le pseudo n\'existe pas', async () => {
      db.user.findUnique.mockResolvedValue(null);
      await expect(service.sendFriendRequest(requesterId, dto)).rejects.toThrow(NotFoundException);
    });

    it('devrait lever BadRequestException si l\'utilisateur s\'envoie une demande à lui-même', async () => {
      db.user.findUnique.mockResolvedValue({ ...receiver, id: requesterId });
      await expect(service.sendFriendRequest(requesterId, dto)).rejects.toThrow(BadRequestException);
    });

    it('devrait lever BadRequestException si le destinataire est un invité', async () => {
      db.user.findUnique.mockResolvedValue({ ...receiver, isGuest: true });
      await expect(service.sendFriendRequest(requesterId, dto)).rejects.toThrow(BadRequestException);
    });

    it('devrait lever ConflictException si les deux sont déjà amis', async () => {
      db.user.findUnique.mockResolvedValue(receiver);
      db.friendship.findFirst.mockResolvedValue({ status: FriendshipStatus.ACCEPTED });
      await expect(service.sendFriendRequest(requesterId, dto)).rejects.toThrow(ConflictException);
    });

    it('devrait lever ConflictException si une demande est déjà en attente', async () => {
      db.user.findUnique.mockResolvedValue(receiver);
      db.friendship.findFirst.mockResolvedValue({ status: FriendshipStatus.PENDING });
      await expect(service.sendFriendRequest(requesterId, dto)).rejects.toThrow(ConflictException);
    });

    it('devrait lever ForbiddenException si la relation est bloquée', async () => {
      db.user.findUnique.mockResolvedValue(receiver);
      db.friendship.findFirst.mockResolvedValue({ status: FriendshipStatus.BLOCKED });
      await expect(service.sendFriendRequest(requesterId, dto)).rejects.toThrow(ForbiddenException);
    });
  });

  // ── acceptFriendRequest ──────────────────────────────────────────────────────

  describe('acceptFriendRequest', () => {
    const receiverId = 'user-b';
    const friendship = {
      id: 'f1',
      requesterId: 'user-a',
      receiverId,
      status: FriendshipStatus.PENDING,
    };

    it('devrait passer la relation en ACCEPTED', async () => {
      db.friendship.findUnique.mockResolvedValue(friendship);
      db.friendship.update.mockResolvedValue({ ...friendship, status: FriendshipStatus.ACCEPTED });

      await service.acceptFriendRequest('f1', receiverId);

      expect(db.friendship.update).toHaveBeenCalledWith({
        where: { id: 'f1' },
        data: { status: FriendshipStatus.ACCEPTED },
        include: expect.any(Object),
      });
    });

    it('devrait lever ForbiddenException si ce n\'est pas le destinataire qui accepte', async () => {
      db.friendship.findUnique.mockResolvedValue(friendship);
      await expect(service.acceptFriendRequest('f1', 'wrong-user')).rejects.toThrow(ForbiddenException);
    });

    it('devrait lever BadRequestException si le statut n\'est pas PENDING', async () => {
      db.friendship.findUnique.mockResolvedValue({ ...friendship, status: FriendshipStatus.ACCEPTED });
      await expect(service.acceptFriendRequest('f1', receiverId)).rejects.toThrow(BadRequestException);
    });

    it('devrait lever NotFoundException si la relation n\'existe pas', async () => {
      db.friendship.findUnique.mockResolvedValue(null);
      await expect(service.acceptFriendRequest('f1', receiverId)).rejects.toThrow(NotFoundException);
    });
  });

  // ── blockUser ────────────────────────────────────────────────────────────────

  describe('blockUser', () => {
    const userId = 'user-a';
    const friendship = { id: 'f1', requesterId: userId, receiverId: 'user-b', status: FriendshipStatus.ACCEPTED };

    it('devrait bloquer si l\'utilisateur fait partie de la relation (en tant que demandeur)', async () => {
      db.friendship.findUnique.mockResolvedValue(friendship);
      db.friendship.update.mockResolvedValue({ ...friendship, status: FriendshipStatus.BLOCKED });

      await service.blockUser('f1', userId);
      expect(db.friendship.update).toHaveBeenCalledWith({
        where: { id: 'f1' },
        data: { status: FriendshipStatus.BLOCKED },
      });
    });

    it('devrait lever ForbiddenException si l\'utilisateur n\'est pas dans la relation', async () => {
      db.friendship.findUnique.mockResolvedValue(friendship);
      await expect(service.blockUser('f1', 'intruder')).rejects.toThrow(ForbiddenException);
    });
  });

  // ── removeFriendship ─────────────────────────────────────────────────────────

  describe('removeFriendship', () => {
    it('devrait supprimer la relation si l\'utilisateur en fait partie', async () => {
      db.friendship.findUnique.mockResolvedValue({
        id: 'f1', requesterId: 'user-a', receiverId: 'user-b',
      });
      db.friendship.delete.mockResolvedValue({});

      const result = await service.removeFriendship('f1', 'user-a');
      expect(db.friendship.delete).toHaveBeenCalledWith({ where: { id: 'f1' } });
      expect(result.message).toBeDefined();
    });

    it('devrait lever ForbiddenException si l\'utilisateur est un tiers', async () => {
      db.friendship.findUnique.mockResolvedValue({
        id: 'f1', requesterId: 'user-a', receiverId: 'user-b',
      });
      await expect(service.removeFriendship('f1', 'intruder')).rejects.toThrow(ForbiddenException);
    });
  });

  // ── getFriends ───────────────────────────────────────────────────────────────

  describe('getFriends', () => {
    it('devrait toujours retourner "l\'autre" utilisateur (normalisation)', async () => {
      const userId = 'user-a';
      db.friendship.findMany.mockResolvedValue([
        {
          id: 'f1',
          requesterId: userId,
          receiverId: 'user-b',
          updatedAt: new Date(),
          requester: { id: userId, pseudo: 'Alice' },
          receiver: { id: 'user-b', pseudo: 'Bob' },
        },
      ]);

      const result = await service.getFriends(userId);
      expect(result[0].friend.pseudo).toBe('Bob'); // l'autre, pas soi-même
    });
  });

  // ── createReview ─────────────────────────────────────────────────────────────

  describe('createReview', () => {
    const userId = 'user-a';
    const dto = { parcoursId: 'p1', rating: 4, comment: 'Super !' };

    it('devrait créer un avis sur un parcours publié', async () => {
      db.parcours.findUnique.mockResolvedValue({ id: 'p1', status: 'PUBLISHED' });
      db.review.findUnique.mockResolvedValue(null);
      db.review.create.mockResolvedValue({ id: 'r1', ...dto, userId });

      const result = await service.createReview(userId, dto);
      expect(result.id).toBe('r1');
    });

    it('devrait lever BadRequestException pour un parcours non publié', async () => {
      db.parcours.findUnique.mockResolvedValue({ id: 'p1', status: 'DRAFT' });
      await expect(service.createReview(userId, dto)).rejects.toThrow(BadRequestException);
    });

    it('devrait lever ConflictException si un avis existe déjà', async () => {
      db.parcours.findUnique.mockResolvedValue({ id: 'p1', status: 'PUBLISHED' });
      db.review.findUnique.mockResolvedValue({ id: 'existing' });
      await expect(service.createReview(userId, dto)).rejects.toThrow(ConflictException);
    });

    it('devrait lever NotFoundException si le parcours n\'existe pas', async () => {
      db.parcours.findUnique.mockResolvedValue(null);
      await expect(service.createReview(userId, dto)).rejects.toThrow(NotFoundException);
    });
  });

  // ── deleteReview ─────────────────────────────────────────────────────────────

  describe('deleteReview', () => {
    const review = { id: 'r1', userId: 'user-a' };

    it('devrait permettre à l\'auteur de supprimer son avis', async () => {
      db.review.findUnique.mockResolvedValue(review);
      db.review.delete.mockResolvedValue({});

      await service.deleteReview('r1', 'user-a', Role.USER);
      expect(db.review.delete).toHaveBeenCalledWith({ where: { id: 'r1' } });
    });

    it('devrait permettre à un ADMIN de supprimer n\'importe quel avis (modération)', async () => {
      db.review.findUnique.mockResolvedValue(review);
      db.review.delete.mockResolvedValue({});

      await service.deleteReview('r1', 'another-user', Role.ADMIN);
      expect(db.review.delete).toHaveBeenCalled();
    });

    it('devrait lever ForbiddenException si l\'utilisateur n\'est pas l\'auteur et pas admin', async () => {
      db.review.findUnique.mockResolvedValue(review);
      await expect(service.deleteReview('r1', 'another-user', Role.USER)).rejects.toThrow(ForbiddenException);
    });

    it('devrait lever NotFoundException si l\'avis n\'existe pas', async () => {
      db.review.findUnique.mockResolvedValue(null);
      await expect(service.deleteReview('r1', 'user-a', Role.USER)).rejects.toThrow(NotFoundException);
    });
  });
});
