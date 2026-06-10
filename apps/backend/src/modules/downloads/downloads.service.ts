import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';

@Injectable()
export class DownloadsService {
  constructor(private readonly db: DatabaseService) {}

  /**
   * Enregistre un téléchargement de parcours.
   * userId est null si l'utilisateur est un invité non connecté.
   */
  async recordDownload(parcoursId: string, userId?: string | null) {
    return this.db.parcoursDownload.create({
      data: {
        parcoursId,
        userId: userId ?? null,
      },
    });
  }
}
