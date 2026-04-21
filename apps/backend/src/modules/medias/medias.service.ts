import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import { join } from 'path';

@Injectable()
export class MediasService {
  constructor(private readonly configService: ConfigService) {}

  /**
   * Retourne l'URL publique absolue du fichier uploadé
   */
  getFileUrl(filename: string, subfolder: 'images' | 'audio' | 'gpx'): string {
    const appUrl = this.configService.get<string>('APP_URL') || 'http://localhost:3000';
    return `${appUrl}/uploads/${subfolder}/${filename}`;
  }

  /**
   * Construit la réponse après upload
   */
  buildUploadResponse(file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('Aucun fichier reçu');
    }

    // Détermine le sous-dossier à partir du chemin de destination
    const subfolder = file.destination.includes('images')
      ? 'images'
      : file.destination.includes('audio')
        ? 'audio'
        : 'gpx';

    const url = this.getFileUrl(file.filename, subfolder as any);

    return {
      filename: file.filename,
      originalName: file.originalname,
      mimetype: file.mimetype,
      size: file.size,
      url,
    };
  }

  /**
   * Supprime physiquement un fichier du disque
   */
  async deleteFile(filename: string) {
    // Sécurité : empêcher la traversée de répertoire (path traversal)
    if (filename.includes('..') || filename.includes('/')) {
      throw new BadRequestException('Nom de fichier invalide');
    }

    // On cherche dans tous les sous-dossiers
    const subfolders = ['images', 'audio', 'gpx'];
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
}
