import {
  Injectable,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import { CreateZonageDto } from './dto/create-zonage.dto';

@Injectable()
export class ZonagesService {
  constructor(private readonly db: DatabaseService) {}

  async findAll() {
    return this.db.zonage.findMany({
      select: { id: true, nom: true, codePostal: true },
      orderBy: { nom: 'asc' },
    });
  }

  async create(dto: CreateZonageDto) {
    const existing = await this.db.zonage.findUnique({ where: { nom: dto.nom } });
    if (existing) throw new ConflictException(`La zonage "${dto.nom}" existe déjà`);
    return this.db.zonage.create({ data: dto });
  }

  async getStatsForInvestors() {
    // Tableau croisé : par zonage → nb joueurs uniques + nb parcours terminés
    const stats = await this.db.zonage.findMany({
      select: {
        id: true,
        nom: true,
        codePostal: true,
        parcours: {
          select: {
            id: true,
            title: true,
            usersStats: {
              select: { userId: true },
            },
          },
        },
      },
      orderBy: { nom: 'asc' },
    });

    return stats.map((zonage) => {
      const totalParcours = zonage.parcours.length;
      const allPlayerIds = zonage.parcours.flatMap((p) =>
        p.usersStats.map((s) => s.userId),
      );
      const uniquePlayers = new Set(allPlayerIds).size;
      const totalCompletions = allPlayerIds.length;

      return {
        id: zonage.id,
        nom: zonage.nom,
        codePostal: zonage.codePostal,
        totalParcours,
        uniquePlayers,
        totalCompletions,
      };
    });
  }

  async findOne(id: string) {
    const zonage = await this.db.zonage.findUnique({ where: { id } });
    if (!zonage) throw new NotFoundException(`Zonage #${id} introuvable`);
    return zonage;
  }
}
