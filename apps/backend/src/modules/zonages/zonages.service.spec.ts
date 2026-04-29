import { Test, TestingModule } from '@nestjs/testing';
import { ZonagesService } from './zonages.service';
import { DatabaseService } from '../../database/database.service';
import { ConflictException, NotFoundException } from '@nestjs/common';

const makeMockDb = () => ({
  zonage: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
  },
  userParcours: {
    groupBy: jest.fn(),
    findMany: jest.fn(),
  },
  parcours: {
    findMany: jest.fn(),
  },
  review: {
    groupBy: jest.fn(),
  },
});

describe('ZonagesService', () => {
  let service: ZonagesService;
  let db: ReturnType<typeof makeMockDb>;

  beforeEach(async () => {
    db = makeMockDb();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ZonagesService,
        { provide: DatabaseService, useValue: db },
      ],
    }).compile();
    service = module.get<ZonagesService>(ZonagesService);
  });

  afterEach(() => jest.clearAllMocks());

  // ── create ───────────────────────────────────────────────────────────────────

  describe('create', () => {
    it('devrait créer une zonage si le nom n\'existe pas encore', async () => {
      db.zonage.findUnique.mockResolvedValue(null);
      db.zonage.create.mockResolvedValue({ id: 'z1', nom: 'Lyon', codePostal: '69000' });

      const result = await service.create({ nom: 'Lyon', codePostal: '69000' });
      expect(result.nom).toBe('Lyon');
    });

    it('devrait lever ConflictException si le nom existe déjà', async () => {
      db.zonage.findUnique.mockResolvedValue({ id: 'z1', nom: 'Lyon' });
      await expect(service.create({ nom: 'Lyon', codePostal: '69000' })).rejects.toThrow(ConflictException);
    });
  });

  // ── findOne ──────────────────────────────────────────────────────────────────

  describe('findOne', () => {
    it('devrait retourner la zonage si elle existe', async () => {
      db.zonage.findUnique.mockResolvedValue({ id: 'z1', nom: 'Lyon' });
      const result = await service.findOne('z1');
      expect(result.id).toBe('z1');
    });

    it('devrait lever NotFoundException si la zonage n\'existe pas', async () => {
      db.zonage.findUnique.mockResolvedValue(null);
      await expect(service.findOne('not-found')).rejects.toThrow(NotFoundException);
    });
  });

  // ── getStatsForInvestors ──────────────────────────────────────────────────────

  describe('getStatsForInvestors', () => {
    it('devrait retourner les statistiques avec 0 joueurs et 0 completions si pas de données', async () => {
      db.zonage.findMany.mockResolvedValue([
        { id: 'z1', nom: 'Lyon', codePostal: '69000', _count: { parcours: 2 } },
      ]);
      db.userParcours.groupBy.mockResolvedValue([]); // pas de completions
      db.review.groupBy.mockResolvedValue([]);       // pas d'avis

      const result = await service.getStatsForInvestors();

      expect(result).toHaveLength(1);
      expect(result[0].nom).toBe('Lyon');
      expect(result[0].totalParcours).toBe(2);
      expect(result[0].totalCompletions).toBe(0);
      expect(result[0].uniquePlayers).toBe(0);
      expect(result[0].averageRating).toBeNull();
    });

    it('devrait calculer correctement joueurs uniques et completions totales', async () => {
      db.zonage.findMany.mockResolvedValue([
        { id: 'z1', nom: 'Lyon', codePostal: '69000', _count: { parcours: 1 } },
      ]);

      // Deux completions pour le même parcours
      db.userParcours.groupBy.mockResolvedValue([
        { parcoursId: 'p1', _count: { userId: 2 } },
      ]);
      db.parcours.findMany.mockResolvedValue([
        { id: 'p1', zonageId: 'z1' },
      ]);
      // Deux joueurs différents
      db.userParcours.findMany.mockResolvedValue([
        { parcoursId: 'p1', userId: 'user-a' },
        { parcoursId: 'p1', userId: 'user-b' },
      ]);

      db.review.groupBy.mockResolvedValue([]);

      const result = await service.getStatsForInvestors();

      expect(result[0].totalCompletions).toBe(2);
      expect(result[0].uniquePlayers).toBe(2); // 2 joueurs uniques
    });

    it('devrait dédoublonner les joueurs si un joueur a terminé plusieurs parcours', async () => {
      db.zonage.findMany.mockResolvedValue([
        { id: 'z1', nom: 'Lyon', codePostal: '69000', _count: { parcours: 2 } },
      ]);

      db.userParcours.groupBy.mockResolvedValue([
        { parcoursId: 'p1', _count: { userId: 1 } },
        { parcoursId: 'p2', _count: { userId: 1 } },
      ]);
      db.parcours.findMany.mockResolvedValue([
        { id: 'p1', zonageId: 'z1' },
        { id: 'p2', zonageId: 'z1' },
      ]);
      // Même joueur sur les deux parcours
      db.userParcours.findMany.mockResolvedValue([
        { parcoursId: 'p1', userId: 'user-a' },
        { parcoursId: 'p2', userId: 'user-a' }, // même user !
      ]);
      db.review.groupBy.mockResolvedValue([]);

      const result = await service.getStatsForInvestors();

      expect(result[0].totalCompletions).toBe(2);
      expect(result[0].uniquePlayers).toBe(1); // dédoublonné → 1 seul joueur unique
    });

    it('devrait calculer la note moyenne pondérée correctement', async () => {
      db.zonage.findMany.mockResolvedValue([
        { id: 'z1', nom: 'Lyon', codePostal: '69000', _count: { parcours: 1 } },
      ]);

      // Pas de completions → groupBy retourne [] → la branche .then() court-circuite
      // et n'appelle PAS parcours.findMany
      db.userParcours.groupBy.mockResolvedValue([]);
      db.userParcours.findMany.mockResolvedValue([]);

      // Un parcours noté 4.5 sur 2 avis
      db.review.groupBy.mockResolvedValue([
        { parcoursId: 'p1', _avg: { rating: 4.5 }, _count: { rating: 2 } },
      ]);

      // parcours.findMany n'est appelé QUE par le bloc reviews (completions est vide → skip)
      db.parcours.findMany.mockResolvedValue([{ id: 'p1', zonageId: 'z1' }]);

      const result = await service.getStatsForInvestors();

      expect(result[0].averageRating).toBe(4.5);
    });
  });
});
