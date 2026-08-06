import { Test, TestingModule } from '@nestjs/testing';
import { MediasService } from './medias.service';
import { AppConfigService } from '../../config/app-config.service';
import { DatabaseService } from '../../database/database.service';
import { BadRequestException, NotFoundException } from '@nestjs/common';

const mockAppConfig = {
  buildMediaUrl: jest.fn(
    (subfolder: string, filename: string) =>
      `http://localhost:3000/uploads/${subfolder}/${filename}`,
  ),
};

const mockDbService = {
  parcours: { findFirst: jest.fn().mockResolvedValue(null), findMany: jest.fn().mockResolvedValue([]) },
  jeu: { findFirst: jest.fn().mockResolvedValue(null), findMany: jest.fn().mockResolvedValue([]) },
};

describe('MediasService', () => {
  let service: MediasService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MediasService,
        { provide: AppConfigService, useValue: mockAppConfig },
        { provide: DatabaseService, useValue: mockDbService },
      ],
    }).compile();
    service = module.get<MediasService>(MediasService);
  });

  afterEach(() => jest.clearAllMocks());

  // ── buildUploadResponse ───────────────────────────────────────────────────

  describe('buildUploadResponse', () => {
    it('devrait retourner une URL publique et les métadonnées du fichier', () => {
      const fakeFile = {
        filename: 'oiseau-test.jpg',
        originalname: 'oiseau.jpg',
        mimetype: 'image/jpeg',
        size: 12345,
        destination: '/uploads/images',
      } as Express.Multer.File;

      const result = service.buildUploadResponse(fakeFile);

      expect(result.filename).toBe('oiseau-test.jpg');
      expect(result.url).toContain('oiseau-test.jpg');
      expect(result.originalName).toBe('oiseau.jpg');
      expect(mockAppConfig.buildMediaUrl).toHaveBeenCalledWith('images', 'oiseau-test.jpg');
    });

    it('devrait lever BadRequestException si aucun fichier n\'est fourni', () => {
      expect(() => service.buildUploadResponse(null as any)).toThrow(BadRequestException);
    });

    it('devrait détecter le sous-dossier "audio" depuis le chemin de destination', () => {
      const fakeFile = {
        filename: 'ambiance.mp3',
        originalname: 'ambiance.mp3',
        mimetype: 'audio/mpeg',
        size: 45000,
        destination: '/uploads/audio',
      } as Express.Multer.File;

      service.buildUploadResponse(fakeFile);
      expect(mockAppConfig.buildMediaUrl).toHaveBeenCalledWith('audio', 'ambiance.mp3');
    });
  });

  // ── processAndBuildUploadResponse ─────────────────────────────────────────

  describe('processAndBuildUploadResponse', () => {
    it('devrait retourner la réponse normalement si le fichier n\'est pas accessible sur le disque (testitaire simple)', async () => {
      const fakeFile = {
        filename: 'test.jpg',
        originalname: 'test.jpg',
        mimetype: 'image/jpeg',
        size: 1234,
        destination: '/uploads/images',
        path: '/inexistant/path.jpg',
      } as Express.Multer.File;

      const result = await service.processAndBuildUploadResponse(fakeFile);
      expect(result.filename).toBe('test.jpg');
    });

    it('devrait lever BadRequestException si aucun fichier n\'est fourni', async () => {
      await expect(service.processAndBuildUploadResponse(null as any)).rejects.toThrow(BadRequestException);
    });
  });

  // ── getFileUrl ────────────────────────────────────────────────────────────

  describe('getFileUrl', () => {
    it('devrait déléguer la construction de l\'URL à AppConfigService', () => {
      service.getFileUrl('test.jpg', 'images');
      expect(mockAppConfig.buildMediaUrl).toHaveBeenCalledWith('images', 'test.jpg');
    });
  });

  // ── deleteFile — règles de sécurité (ne nécessitent pas le disque) ────────

  describe('deleteFile — sécurité path traversal', () => {
    it('devrait lever BadRequestException pour un chemin avec ".."', async () => {
      await expect(service.deleteFile('../../../etc/passwd')).rejects.toThrow(BadRequestException);
    });

    it('devrait lever BadRequestException pour un nom contenant "/"', async () => {
      await expect(service.deleteFile('subdir/fichier.jpg')).rejects.toThrow(BadRequestException);
    });

    it('devrait lever NotFoundException si le fichier n\'est pas trouvé dans les sous-dossiers', async () => {
      // Le fichier "fantome.jpg" n'existe pas sur le vrai disque → NotFoundException attendue
      await expect(service.deleteFile('fantome-inexistant-xyz.jpg')).rejects.toThrow(NotFoundException);
    });
  });
});
