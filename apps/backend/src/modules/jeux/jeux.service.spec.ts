import { Test, TestingModule } from '@nestjs/testing';
import { JeuxService } from './jeux.service';
import { DatabaseService } from '../../database/database.service';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Role } from '@prisma/client';

const makeMockDb = () => ({
  etape: { findUnique: jest.fn() },
  jeu: {
    create: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
});

describe('JeuxService', () => {
  let service: JeuxService;
  let db: ReturnType<typeof makeMockDb>;

  beforeEach(async () => {
    db = makeMockDb();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JeuxService,
        { provide: DatabaseService, useValue: db },
      ],
    }).compile();
    service = module.get<JeuxService>(JeuxService);
  });

  afterEach(() => jest.clearAllMocks());

  // ── create ────────────────────────────────────────────────────────────────

  describe('create', () => {
    it('devrait créer un jeu si l\'étape appartient au bon organisme', async () => {
      db.etape.findUnique.mockResolvedValue({
        id: 'e1',
        parcours: { organismeId: 'org-1' },
      });
      db.jeu.create.mockResolvedValue({ id: 'j1' });

      const result = await service.create(
        { etapeId: 'e1', type: 'QCM', order: 1, question: 'Q?' } as any,
        Role.EDITOR,
        'org-1',
      );
      expect(result.id).toBe('j1');
    });

    it('devrait lever ForbiddenException si l\'étape appartient à un autre organisme', async () => {
      db.etape.findUnique.mockResolvedValue({
        id: 'e1',
        parcours: { organismeId: 'org-other' },
      });
      await expect(
        service.create({ etapeId: 'e1' } as any, Role.EDITOR, 'org-1'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('devrait lever NotFoundException si l\'étape n\'existe pas', async () => {
      db.etape.findUnique.mockResolvedValue(null);
      await expect(
        service.create({ etapeId: 'not-found' } as any, Role.EDITOR, 'org-1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('devrait autoriser un SUPER_ADMIN à créer dans n\'importe quel organisme', async () => {
      db.etape.findUnique.mockResolvedValue({
        id: 'e1',
        parcours: { organismeId: 'org-other' },
      });
      db.jeu.create.mockResolvedValue({ id: 'j2' });

      const result = await service.create(
        { etapeId: 'e1', type: 'TEXTE', order: 1 } as any,
        Role.SUPER_ADMIN,
        null,
      );
      expect(result.id).toBe('j2');
    });
  });

  // ── findOne ────────────────────────────────────────────────────────────────

  describe('findOne', () => {
    it('devrait retourner un jeu existant', async () => {
      db.jeu.findUnique.mockResolvedValue({
        id: 'j1',
        etape: { parcours: { organismeId: 'org-1' } },
      });
      const result = await service.findOne('j1', Role.EDITOR, 'org-1');
      expect(result.id).toBe('j1');
    });

    it('devrait lever NotFoundException si le jeu n\'existe pas', async () => {
      db.jeu.findUnique.mockResolvedValue(null);
      await expect(service.findOne('not-found', Role.EDITOR, 'org-1')).rejects.toThrow(NotFoundException);
    });

    it('devrait lever ForbiddenException pour accès cross-organisme', async () => {
      db.jeu.findUnique.mockResolvedValue({
        id: 'j1',
        etape: { parcours: { organismeId: 'org-other' } },
      });
      await expect(service.findOne('j1', Role.EDITOR, 'org-1')).rejects.toThrow(ForbiddenException);
    });
  });

  // ── remove ─────────────────────────────────────────────────────────────────

  describe('remove', () => {
    it('devrait supprimer un jeu existant dans le bon organisme', async () => {
      db.jeu.findUnique.mockResolvedValue({
        id: 'j1',
        etape: { parcours: { organismeId: 'org-1' } },
      });
      db.jeu.delete.mockResolvedValue({});

      await service.remove('j1', Role.EDITOR, 'org-1');
      expect(db.jeu.delete).toHaveBeenCalledWith({ where: { id: 'j1' } });
    });

    it('devrait lever ForbiddenException pour un jeu cross-organisme', async () => {
      db.jeu.findUnique.mockResolvedValue({
        id: 'j1',
        etape: { parcours: { organismeId: 'org-other' } },
      });
      await expect(service.remove('j1', Role.EDITOR, 'org-1')).rejects.toThrow(ForbiddenException);
    });
  });
});
