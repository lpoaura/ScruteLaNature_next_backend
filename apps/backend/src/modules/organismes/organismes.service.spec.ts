import { Test, TestingModule } from '@nestjs/testing';
import { OrganismesService } from './organismes.service';
import { DatabaseService } from '../../database/database.service';
import { ConflictException, NotFoundException } from '@nestjs/common';

const makeMockDb = () => ({
  organisme: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
});

describe('OrganismesService', () => {
  let service: OrganismesService;
  let db: ReturnType<typeof makeMockDb>;

  beforeEach(async () => {
    db = makeMockDb();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrganismesService,
        { provide: DatabaseService, useValue: db },
      ],
    }).compile();
    service = module.get<OrganismesService>(OrganismesService);
  });

  afterEach(() => jest.clearAllMocks());

  describe('create', () => {
    it('devrait créer un organisme si le nom est unique', async () => {
      db.organisme.findUnique.mockResolvedValue(null);
      db.organisme.create.mockResolvedValue({ id: 'o1', nom: 'LPO Rhône-Alpes' });

      const result = await service.create({ nom: 'LPO Rhône-Alpes' } as any);
      expect(result.id).toBe('o1');
    });

    it('devrait lever ConflictException si le nom existe déjà', async () => {
      db.organisme.findUnique.mockResolvedValue({ id: 'o1', nom: 'LPO Rhône-Alpes' });
      await expect(service.create({ nom: 'LPO Rhône-Alpes' } as any)).rejects.toThrow(ConflictException);
    });
  });

  describe('findOne', () => {
    it('devrait retourner un organisme existant', async () => {
      db.organisme.findUnique.mockResolvedValue({ id: 'o1', nom: 'LPO Rhône-Alpes' });
      const result = await service.findOne('o1');
      expect(result.id).toBe('o1');
    });

    it('devrait lever NotFoundException si l\'organisme n\'existe pas', async () => {
      db.organisme.findUnique.mockResolvedValue(null);
      await expect(service.findOne('not-found')).rejects.toThrow(NotFoundException);
    });
  });

  describe('findAll', () => {
    it('devrait retourner la liste de tous les organismes', async () => {
      db.organisme.findMany.mockResolvedValue([{ id: 'o1' }, { id: 'o2' }]);
      const result = await service.findAll();
      expect(result).toHaveLength(2);
    });
  });
});
