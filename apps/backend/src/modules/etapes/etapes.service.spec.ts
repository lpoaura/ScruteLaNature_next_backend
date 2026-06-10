import { Test, TestingModule } from '@nestjs/testing';
import { EtapesService } from './etapes.service';
import { DatabaseService } from '../../database/database.service';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Role } from '@prisma/client';

const makeMockDb = () => ({
  parcours: { findUnique: jest.fn() },
  etape: {
    create: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
});

describe('EtapesService', () => {
  let service: EtapesService;
  let db: ReturnType<typeof makeMockDb>;

  beforeEach(async () => {
    db = makeMockDb();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EtapesService,
        { provide: DatabaseService, useValue: db },
      ],
    }).compile();
    service = module.get<EtapesService>(EtapesService);
  });

  afterEach(() => jest.clearAllMocks());

  // ── create ────────────────────────────────────────────────────────────────

  describe('create', () => {
    it('devrait créer une étape si le parcours appartient à l\'organisme', async () => {
      // ensureParcoursAccess fait findUnique sur parcours
      db.parcours.findUnique.mockResolvedValue({ id: 'p1', organismeId: 'org-1' });
      db.etape.create.mockResolvedValue({ id: 'e1' });

      const result = await service.create(
        { parcoursId: 'p1', latitude: 45.7, longitude: 4.8, order: 1, title: 'Départ' } as any,
        Role.EDITOR,
        'org-1',
      );
      expect(result.id).toBe('e1');
    });

    it('devrait lever ForbiddenException si le parcours appartient à un autre organisme', async () => {
      db.parcours.findUnique.mockResolvedValue({ id: 'p1', organismeId: 'org-other' });

      await expect(
        service.create({ parcoursId: 'p1' } as any, Role.EDITOR, 'org-1'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('devrait lever NotFoundException si le parcours n\'existe pas', async () => {
      db.parcours.findUnique.mockResolvedValue(null);

      await expect(
        service.create({ parcoursId: 'not-found' } as any, Role.EDITOR, 'org-1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('devrait autoriser un SUPER_ADMIN à créer dans n\'importe quel organisme', async () => {
      db.parcours.findUnique.mockResolvedValue({ id: 'p1', organismeId: 'org-other' });
      db.etape.create.mockResolvedValue({ id: 'e2' });

      const result = await service.create(
        { parcoursId: 'p1', latitude: 45.7, longitude: 4.8, order: 1, title: 'Étape' } as any,
        Role.SUPER_ADMIN,
        'org-1',
      );
      expect(result.id).toBe('e2');
    });
  });

  // ── findOne ────────────────────────────────────────────────────────────────

  describe('findOne', () => {
    it('devrait retourner une étape existante', async () => {
      db.etape.findUnique.mockResolvedValue({
        id: 'e1',
        parcours: { organismeId: 'org-1' },
      });

      const result = await service.findOne('e1', Role.EDITOR, 'org-1');
      expect(result.id).toBe('e1');
    });

    it('devrait lever NotFoundException si l\'étape n\'existe pas', async () => {
      db.etape.findUnique.mockResolvedValue(null);
      await expect(service.findOne('not-found', Role.EDITOR, 'org-1')).rejects.toThrow(NotFoundException);
    });

    it('devrait lever ForbiddenException pour accès cross-organisme', async () => {
      db.etape.findUnique.mockResolvedValue({
        id: 'e1',
        parcours: { organismeId: 'org-other' },
      });
      await expect(service.findOne('e1', Role.EDITOR, 'org-1')).rejects.toThrow(ForbiddenException);
    });
  });

  // ── remove ─────────────────────────────────────────────────────────────────

  describe('remove', () => {
    it('devrait supprimer une étape existante du bon organisme', async () => {
      // findOne est appelé en interne par remove
      db.etape.findUnique.mockResolvedValue({
        id: 'e1',
        parcours: { organismeId: 'org-1' },
      });
      db.etape.delete.mockResolvedValue({});

      await service.remove('e1', Role.EDITOR, 'org-1');
      expect(db.etape.delete).toHaveBeenCalledWith({ where: { id: 'e1' } });
    });

    it('devrait lever NotFoundException si l\'étape n\'existe pas', async () => {
      db.etape.findUnique.mockResolvedValue(null);
      await expect(service.remove('not-found', Role.EDITOR, 'org-1')).rejects.toThrow(NotFoundException);
    });
  });
});
