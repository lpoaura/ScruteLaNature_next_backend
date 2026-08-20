import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { AppConfigService } from '../../config/app-config.service';
import { DatabaseService } from '../../database/database.service';
import * as fs from 'fs';
import { join, extname } from 'path';
import sharp from 'sharp';

@Injectable()
export class MediasService {
  constructor(
    private readonly appConfig: AppConfigService,
    private readonly db: DatabaseService,
  ) {}

  /**
   * Retourne l'URL publique absolue du fichier uploadé
   */
  getFileUrl(filename: string, subfolder: 'images' | 'audio' | 'gpx' | string): string {
    return this.appConfig.buildMediaUrl(subfolder, filename);
  }

  /**
   * Construit la réponse après upload
   */
  buildUploadResponse(file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('Aucun fichier reçu');
    }

    // Détermine le sous-dossier exact à partir du chemin de destination
    const pathParts = file.destination.split(/[/\\]/);
    const subfolder = pathParts[pathParts.length - 1];

    const url = this.getFileUrl(file.filename, subfolder);

    return {
      filename: file.filename,
      originalName: file.originalname,
      mimetype: file.mimetype,
      size: file.size,
      url,
    };
  }

  /**
   * Convertit l'image en WebP et construit la réponse
   */
  async processAndBuildUploadResponse(file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('Aucun fichier reçu');
    }

    // Conversion automatique en WebP pour toutes les images (hors SVG)
    if (file.mimetype && file.mimetype.startsWith('image/') && !file.mimetype.includes('svg')) {
      if (file.path && fs.existsSync(file.path)) {
        const ext = extname(file.filename);
        if (ext.toLowerCase() !== '.webp') {
          const origExtIdx = file.filename.lastIndexOf('.');
          const baseFilename = origExtIdx > 0 ? file.filename.substring(0, origExtIdx) : file.filename;
          const newFilename = `${baseFilename}.webp`;
          const newPath = join(file.destination, newFilename);

          try {
            await sharp(file.path)
              .rotate()
              .webp({ quality: 85 })
              .toFile(newPath);

            // Supprimer l'ancien fichier d'origine
            if (fs.existsSync(file.path)) {
              fs.unlinkSync(file.path);
            }

            // Mettre à jour les propriétés du fichier vers le nouveau fichier WebP
            file.filename = newFilename;
            file.path = newPath;
            file.mimetype = 'image/webp';
            const newStats = fs.statSync(newPath);
            file.size = newStats.size;

            // Mettre à jour originalname avec l'extension .webp
            const origNameExtIdx = file.originalname.lastIndexOf('.');
            if (origNameExtIdx > 0) {
              file.originalname = `${file.originalname.substring(0, origNameExtIdx)}.webp`;
            } else {
              file.originalname = `${file.originalname}.webp`;
            }
          } catch (error) {
            console.error('Erreur lors de la conversion WebP:', error);
            throw new BadRequestException("Impossible de convertir l'image en WebP.");
          }
        }
      }
    }

    return this.buildUploadResponse(file);
  }

  /**
   * Supprime physiquement un fichier du disque
   */
  async deleteFile(filename: string) {
    // Sécurité : empêcher la traversée de répertoire (path traversal)
    if (filename.includes('..') || filename.includes('/')) {
      throw new BadRequestException('Nom de fichier invalide');
    }

    // Vérifier si le fichier est utilisé dans un parcours
    const isUsedInParcours = await this.db.parcours.findFirst({
      where: {
        OR: [
          { coverImage: { contains: filename } },
        ],
      },
    });

    // Vérifier si le fichier est utilisé dans un jeu
    const isUsedInJeu = await this.db.jeu.findFirst({
      where: {
        OR: [
          { audioUrl: { contains: filename } },
          { imageUrl: { contains: filename } },
        ],
      },
    });

    if (isUsedInParcours || isUsedInJeu) {
      throw new BadRequestException('Ce fichier est actuellement rattaché à un parcours ou un jeu. Impossible de le supprimer.');
    }

    // On cherche dans tous les sous-dossiers (génériques et spécifiques)
    const subfolders = ['images', 'audio', 'gpx', 'specific_images', 'specific_audio', 'specific_gpx'];
    let filePath: string | null = null;

    for (const sub of subfolders) {
      const candidate = join(process.cwd(), 'uploads', sub, filename);
      if (fs.existsSync(candidate)) {
        filePath = candidate;
        break;
      }
    }

    if (!filePath) {
      throw new NotFoundException(`Fichier "${filename}" introuvable sur le serveur`);
    }

    fs.unlinkSync(filePath);
    return { message: `Fichier "${filename}" supprimé avec succès` };
  }

  async findAllFiles(page = 1, limit = 24, type?: string, sortBy?: string) {
    const subfolders = ['images', 'audio', 'gpx'] as const;
    const allFiles: { filename: string; originalName: string; mimetype: string; size: number; url: string; createdAt: Date; isUsed: boolean }[] = [];

    // 1. Récupérer tous les fichiers utilisés
    const parcours = await this.db.parcours.findMany({ select: { coverImage: true }});
    const jeux = await this.db.jeu.findMany({ select: { imageUrl: true, audioUrl: true }});

    const usedFilenames = new Set<string>();
    parcours.forEach(p => {
      if (p.coverImage) usedFilenames.add(p.coverImage.split('/').pop() || '');
    });
    jeux.forEach(j => {
      if (j.imageUrl) usedFilenames.add(j.imageUrl.split('/').pop() || '');
      if (j.audioUrl) usedFilenames.add(j.audioUrl.split('/').pop() || '');
    });

    // Filtrage des sous-dossiers selon le type demandé
    const foldersToScan = type === 'image'
      ? (['images'] as const)
      : type === 'audio'
        ? (['audio'] as const)
        : subfolders;

    for (const sub of foldersToScan) {
      const dirPath = join(process.cwd(), 'uploads', sub);
      if (!fs.existsSync(dirPath)) continue;

      const files = fs.readdirSync(dirPath);
      for (const file of files) {
        if (file === '.gitkeep') continue;
        const stats = fs.statSync(join(dirPath, file));

        const ext = file.split('.').pop()?.toLowerCase() || '';
        let mimetype = 'application/octet-stream';
        if (['jpg', 'jpeg', 'png', 'webp', 'gif', 'svg'].includes(ext)) mimetype = `image/${ext === 'jpg' ? 'jpeg' : ext}`;
        if (['mp3', 'wav', 'ogg'].includes(ext)) mimetype = `audio/${ext}`;
        if (ext === 'gpx') mimetype = 'application/gpx+xml';

        allFiles.push({
          filename: file,
          originalName: file,
          mimetype,
          size: stats.size,
          url: this.getFileUrl(file, sub),
          createdAt: stats.mtime,
          isUsed: usedFilenames.has(file),
        });
      }
    }

    // Trier du plus récent au plus ancien par défaut, ou alphabétique
    if (sortBy === 'name') {
      allFiles.sort((a, b) => a.filename.localeCompare(b.filename));
    } else {
      allFiles.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    }

    // Pagination
    const total = allFiles.length;
    const totalPages = Math.ceil(total / limit);
    const skip = (page - 1) * limit;
    const data = allFiles.slice(skip, skip + limit);

    return {
      data,
      meta: { total, page, limit, totalPages },
    };
  }
}
