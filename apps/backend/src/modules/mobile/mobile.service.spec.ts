import { Test, TestingModule } from '@nestjs/testing';
import { MobileService } from './mobile.service';
import { DatabaseService } from '../../database/database.service';
import { NotFoundException } from '@nestjs/common';
import { PublishStatus } from '@prisma/client';

/**
 * Crée un mock minimal de DatabaseService.
 * Chaque méthode Prisma utilisée est remplacée par un jest.fn()
 * → pas de connexion DB, pas de serveur, tests instantanés.
 */
const makeMockDb = () => ({
  userParcours: {
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    findMany: jest.fn(),
    groupBy: jest.fn(),
  },
  user: {
    update: jest.fn(),
    findUnique: jest.fn(),
  },
  parcours: {
    findMany: jest.fn(),
    findFirst: jest.fn(),
  },
  $transaction: jest.fn(),
});

describe('MobileService', () => {
  let service: MobileService;
  let db: ReturnType<typeof makeMockDb>;

  beforeEach(async () => {
    db = makeMockDb();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MobileService,
        { provide: DatabaseService, useValue: db },
      ],
    }).compile();

    service = module.get<MobileService>(MobileService);
    // On mock le logger pour ne pas polluer la sortie des tests
    jest.spyOn((service as any).logger, 'error').mockImplementation(() => {});
  });

  afterEach(() => jest.restoreAllMocks());

  // ── syncMobileData ──────────────────────────────────────────────────────────

  describe('syncMobileData', () => {
    const userId = 'user-uuid-1';
    const baseEvent = {
      syncId: 'aaaaaaaa-0000-4000-8000-000000000001',
      parcoursId: 'parcours-uuid-1',
      score: 500,
      completedAt: '2026-04-27T14:00:00.000Z',
      co2Saved: 1.5,
    };

    it('devrait incrémenter le score et le CO2 lors d\'une première synchronisation', async () => {
      // Pas de syncId existant → premier passage
      db.userParcours.findUnique.mockResolvedValue(null);

      // Pas de complétion en ligne précédente
      db.$transaction.mockImplementation(async (cb: (tx: any) => any) => {
        const tx = {
          userParcours: {
            findUnique: jest.fn().mockResolvedValue(null), // pas de doublon inline
            create: jest.fn().mockResolvedValue({ id: 'up-1' }),
            update: jest.fn(),
          },
          user: { update: jest.fn() },
        };
        await cb(tx);
        // Vérifier que create ET user.update ont été appelés
        expect(tx.userParcours.create).toHaveBeenCalledWith({
          data: expect.objectContaining({
            syncId: baseEvent.syncId,
            userId,
            score: baseEvent.score,
          }),
        });
        expect(tx.user.update).toHaveBeenCalledWith({
          where: { id: userId },
          data: expect.objectContaining({
            totalPoints: { increment: baseEvent.score },
            co2Saved: { increment: baseEvent.co2Saved },
          }),
        });
      });

      const result = await service.syncMobileData(userId, { parcoursCompleted: [baseEvent] });

      expect(result.success).toBe(true);
      expect(result.results.parcoursCompleted.synced).toBe(1);
      expect(result.results.parcoursCompleted.skipped).toBe(0);
    });

    it('devrait ignorer (skip) un syncId déjà connu — idempotence', async () => {
      // Le syncId existe déjà en base
      db.userParcours.findUnique.mockResolvedValue({ id: 'existing', syncId: baseEvent.syncId });

      const result = await service.syncMobileData(userId, { parcoursCompleted: [baseEvent] });

      expect(result.success).toBe(true);
      expect(result.results.parcoursCompleted.skipped).toBe(1);
      expect(result.results.parcoursCompleted.synced).toBe(0);
      // La transaction ne doit jamais être déclenchée
      expect(db.$transaction).not.toHaveBeenCalled();
    });

    it('devrait n\'incrémenter que la différence si le parcours avait déjà un meilleur score', async () => {
      db.userParcours.findUnique.mockResolvedValue(null);

      const eventWithHigherScore = { ...baseEvent, score: 800 };

      db.$transaction.mockImplementation(async (cb: (tx: any) => any) => {
        const tx = {
          userParcours: {
            findUnique: jest.fn().mockResolvedValue({ id: 'up-1', score: 500 }), // score précédent = 500
            update: jest.fn(),
          },
          user: { update: jest.fn() },
        };
        await cb(tx);
        const scoreDiff = 800 - 500; // = 300
        expect(tx.user.update).toHaveBeenCalledWith({
          where: { id: userId },
          data: expect.objectContaining({
            totalPoints: { increment: scoreDiff },
          }),
        });
      });

      await service.syncMobileData(userId, { parcoursCompleted: [eventWithHigherScore] });
    });

    it('ne devrait PAS incrémenter si le nouveau score est inférieur ou égal', async () => {
      db.userParcours.findUnique.mockResolvedValue(null);

      const eventWithLowerScore = { ...baseEvent, score: 200 };

      db.$transaction.mockImplementation(async (cb: (tx: any) => any) => {
        const tx = {
          userParcours: {
            findUnique: jest.fn().mockResolvedValue({ id: 'up-1', score: 500 }), // meilleur que 200
            update: jest.fn(),
          },
          user: { update: jest.fn() },
        };
        await cb(tx);
        // user.update NE doit PAS être appelé (juste syncId enregistré)
        expect(tx.user.update).not.toHaveBeenCalled();
        // Mais userParcours.update doit l'être pour enregistrer le syncId
        expect(tx.userParcours.update).toHaveBeenCalledWith({
          where: expect.anything(),
          data: { syncId: eventWithLowerScore.syncId },
        });
      });

      await service.syncMobileData(userId, { parcoursCompleted: [eventWithLowerScore] });
    });

    it('devrait retourner success: false et lister les erreurs en cas d\'exception', async () => {
      db.userParcours.findUnique.mockResolvedValue(null);
      db.$transaction.mockRejectedValue(new Error('DB unavailable'));

      const result = await service.syncMobileData(userId, { parcoursCompleted: [baseEvent] });

      expect(result.success).toBe(false);
      expect(result.results.errors).toHaveLength(1);
      expect(result.results.errors[0]).toMatchObject({
        syncId: baseEvent.syncId,
        reason: 'DB unavailable',
      });
    });

    it('devrait retourner des résultats vides si le payload est vide', async () => {
      const result = await service.syncMobileData(userId, {});
      expect(result.success).toBe(true);
      expect(result.results.parcoursCompleted.synced).toBe(0);
      expect(result.results.errors).toHaveLength(0);
    });
  });

  // ── downloadParcours ────────────────────────────────────────────────────────

  describe('downloadParcours', () => {
    it('devrait retourner un parcours publié complet', async () => {
      const fakeParcours = {
        id: 'p1',
        status: PublishStatus.PUBLISHED,
        etapes: [{ id: 'e1', jeux: [] }],
      };
      db.parcours.findFirst.mockResolvedValue(fakeParcours);

      const result = await service.downloadParcours('p1');
      expect(result).toEqual(fakeParcours);
    });

    it('devrait lever NotFoundException si le parcours n\'est pas publié', async () => {
      db.parcours.findFirst.mockResolvedValue(null);
      await expect(service.downloadParcours('not-found')).rejects.toThrow(NotFoundException);
    });
  });

  // ── getNearbyParcours ───────────────────────────────────────────────────────

  describe('getNearbyParcours', () => {
    it('devrait retourner les parcours dans le rayon, triés par distance', async () => {
      db.parcours.findMany.mockResolvedValue([
        {
          id: 'p1',
          etapes: [{ latitude: 45.764, longitude: 4.835 }],
        },
        {
          id: 'p2',
          etapes: [{ latitude: 48.85, longitude: 2.35 }], // Paris, loin
        },
      ]);

      const result = await service.getNearbyParcours({
        latitude: 45.764,
        longitude: 4.835,
        radiusKm: 50,
      });

      // Seul p1 (à 0km) doit être dans les résultats
      expect(result).toHaveLength(1);
      expect((result[0] as any).id).toBe('p1');
      expect((result[0] as any).distanceFromUserKm).toBe(0);
    });

    it('devrait ignorer les parcours sans étape', async () => {
      db.parcours.findMany.mockResolvedValue([
        { id: 'p1', etapes: [] }, // pas d'étape → pas de point de départ
      ]);

      const result = await service.getNearbyParcours({ latitude: 45, longitude: 4, radiusKm: 50 });
      expect(result).toHaveLength(0);
    });
  });
});
