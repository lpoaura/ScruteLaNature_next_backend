import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import { CreateSignalementDto, UpdateSignalementStatusDto } from './signalement.dto';

@Injectable()
export class SignalementsService {
  constructor(private db: DatabaseService) {}

  async createSignalement(userId: string | undefined, dto: CreateSignalementDto) {
    return this.db.signalement.create({
      data: {
        ...dto,
        userId: userId,
      },
    });
  }

  async getAllSignalements() {
    return this.db.signalement.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { id: true, pseudo: true, email: true } },
        parcours: { select: { id: true, title: true } },
        etape: { select: { id: true, title: true, order: true } },
      },
    });
  }

  async updateStatus(id: string, dto: UpdateSignalementStatusDto) {
    return this.db.signalement.update({
      where: { id },
      data: { status: dto.status },
    });
  }
}
