import { Test, TestingModule } from '@nestjs/testing';
import { UsersService } from './users.service';
import { DatabaseService } from '../../database/database.service';
import { MailService } from '../../providers/mail/mail.service';

const makeMockDb = () => ({
  user: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
});

describe('UsersService', () => {
  let service: UsersService;
  let db: ReturnType<typeof makeMockDb>;

  beforeEach(async () => {
    db = makeMockDb();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: DatabaseService, useValue: db },
        { provide: MailService, useValue: { sendWelcomeEmail: jest.fn(), sendVerificationEmail: jest.fn() } },
      ],
    }).compile();
    service = module.get<UsersService>(UsersService);
  });

  afterEach(() => jest.clearAllMocks());

  // ── findOne ──────────────────────────────────────────────────────────────────

  describe('findOne', () => {
    it('devrait retourner un utilisateur sans son mot de passe', async () => {
      db.user.findUnique.mockResolvedValue({
        id: 'u1',
        email: 'alice@test.fr',
        password: 'hashed_secret',
      });

      const result = await service.findOne('u1');
      expect(result.id).toBe('u1');
      expect((result as any).password).toBeUndefined(); // Le mot de passe NE doit PAS être exposé
    });

    it('devrait retourner null si l\'utilisateur n\'existe pas (comportement intentionnel pour l\'auth)', async () => {
      db.user.findUnique.mockResolvedValue(null);
      const result = await service.findOne('not-found');
      expect(result).toBeNull();
    });
  });

  // ── findAll ──────────────────────────────────────────────────────────────────

  describe('findAll', () => {
    it('devrait retourner la liste de tous les utilisateurs', async () => {
      db.user.findMany.mockResolvedValue([{ id: 'u1' }, { id: 'u2' }]);
      const result = await service.findAll();
      expect(result).toHaveLength(2);
    });
  });

  // ── update ───────────────────────────────────────────────────────────────────

  describe('update', () => {
    it('devrait mettre à jour les champs autorisés', async () => {
      const updated = { id: 'u1', firstName: 'Alice', pseudo: 'AliPO' };
      db.user.update.mockResolvedValue(updated);

      const result = await service.update('u1', { firstName: 'Alice', pseudo: 'AliPO' });
      expect(result.firstName).toBe('Alice');
      expect(db.user.update).toHaveBeenCalledWith({
        where: { id: 'u1' },
        data: { firstName: 'Alice', pseudo: 'AliPO' },
      });
    });
  });

  // ── remove ───────────────────────────────────────────────────────────────────

  describe('remove (RGPD)', () => {
    it('devrait supprimer un utilisateur existant et confirmer par un message', async () => {
      db.user.findUnique.mockResolvedValue({ id: 'u1' });
      db.user.delete.mockResolvedValue({ id: 'u1' });

      const result = await service.remove('u1');
      expect(db.user.delete).toHaveBeenCalledWith({ where: { id: 'u1' } });
      expect(result.message).toContain('supprimés');
    });

    it('devrait retourner un message "déjà supprimé" si l\'utilisateur n\'existe plus (idempotent)', async () => {
      db.user.findUnique.mockResolvedValue(null);

      const result = await service.remove('ghost-user');
      expect(db.user.delete).not.toHaveBeenCalled();
      expect(result.message).toContain('supprimé');
    });
  });
});
