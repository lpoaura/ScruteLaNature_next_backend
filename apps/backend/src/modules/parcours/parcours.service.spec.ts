import { Test, TestingModule } from '@nestjs/testing';
import { ParcoursService } from './parcours.service';
import { DatabaseService } from '../../database/database.service';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { PublishStatus, Role } from '@prisma/client';

const makeMockDb = () => ({
  parcours: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  zonage: { findUnique: jest.fn() },
  organisme: { findUnique: jest.fn() },
});

describe('ParcoursService', () => {
  let service: ParcoursService;
  let db: ReturnType<typeof makeMockDb>;

  beforeEach(async () => {
    db = makeMockDb();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ParcoursService,
        { provide: DatabaseService, useValue: db },
      ],
    }).compile();
    service = module.get<ParcoursService>(ParcoursService);
  });

  afterEach(() => jest.clearAllMocks());

  // ── findOne ──────────────────────────────────────────────────────────────────

  describe('findOne', () => {
    it('devrait retourner un parcours si l\'ADMIN appartient au bon organisme', async () => {
      db.parcours.findUnique.mockResolvedValue({ id: 'p1', organismeId: 'org-1' });
      const result = await service.findOne('p1', Role.ADMIN, 'org-1');
      expect(result.id).toBe('p1');
    });

    it('devrait lever NotFoundException si le parcours n\'existe pas', async () => {
      db.parcours.findUnique.mockResolvedValue(null);
      await expect(service.findOne('not-found', Role.ADMIN, 'org-1')).rejects.toThrow(NotFoundException);
    });

    it('devrait lever ForbiddenException pour un ADMIN d\'un autre organisme', async () => {
      db.parcours.findUnique.mockResolvedValue({ id: 'p1', organismeId: 'org-other' });
      await expect(service.findOne('p1', Role.ADMIN, 'org-1')).rejects.toThrow(ForbiddenException);
    });

    it('devrait autoriser un SUPER_ADMIN à voir n\'importe quel parcours', async () => {
      db.parcours.findUnique.mockResolvedValue({ id: 'p1', organismeId: 'org-other' });
      const result = await service.findOne('p1', Role.SUPER_ADMIN, null);
      expect(result.id).toBe('p1');
    });
  });

  // ── create ───────────────────────────────────────────────────────────────────

  describe('create', () => {
    it('devrait créer un parcours avec l\'organismeId de l\'EDITOR', async () => {
      db.zonage.findUnique.mockResolvedValue({ id: 'z1' });
      db.parcours.create.mockResolvedValue({ id: 'p-new', organismeId: 'org-1' });

      const result = await service.create(
        { title: 'Test', zonageId: 'z1' } as any,
        Role.EDITOR,
        'org-1',
      );
      expect(db.parcours.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ organismeId: 'org-1' }),
        }),
      );
      expect(result.id).toBe('p-new');
    });

    it('devrait lever NotFoundException si la zonage n\'existe pas', async () => {
      db.zonage.findUnique.mockResolvedValue(null);
      await expect(
        service.create({ title: 'Test', zonageId: 'z-invalid' } as any, Role.EDITOR, 'org-1'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ── update (publish) ──────────────────────────────────────────────────────────

  describe('update', () => {
    it('devrait publier un parcours en passant le statut à PUBLISHED', async () => {
      // findOne est appelé en interne par update
      db.parcours.findUnique.mockResolvedValue({ id: 'p1', organismeId: 'org-1' });
      db.parcours.update.mockResolvedValue({ id: 'p1', status: PublishStatus.PUBLISHED });

      const result = await service.update('p1', { status: PublishStatus.PUBLISHED } as any, Role.ADMIN, 'org-1');
      expect(result.status).toBe(PublishStatus.PUBLISHED);
    });
  });

  // ── remove ───────────────────────────────────────────────────────────────────

  describe('remove', () => {
    it('devrait supprimer si l\'ADMIN appartient au bon organisme', async () => {
      db.parcours.findUnique.mockResolvedValue({ id: 'p1', organismeId: 'org-1' });
      db.parcours.delete.mockResolvedValue({});

      await service.remove('p1', Role.ADMIN, 'org-1');
      expect(db.parcours.delete).toHaveBeenCalledWith({ where: { id: 'p1' } });
    });

    it('devrait lever ForbiddenException pour un ADMIN d\'un autre organisme', async () => {
      db.parcours.findUnique.mockResolvedValue({ id: 'p1', organismeId: 'org-other' });
      await expect(service.remove('p1', Role.ADMIN, 'org-1')).rejects.toThrow(ForbiddenException);
    });
  });
});
