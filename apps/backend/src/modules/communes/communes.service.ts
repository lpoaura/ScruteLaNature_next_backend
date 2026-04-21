import {
  Injectable,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import { CreateCommuneDto } from './dto/create-commune.dto';

@Injectable()
export class CommunesService {
  constructor(private readonly db: DatabaseService) {}

  async findAll() {
    return this.db.commune.findMany({
      select: { id: true, nom: true, codePostal: true },
      orderBy: { nom: 'asc' },
    });
  }

  async create(dto: CreateCommuneDto) {
    const existing = await this.db.commune.findUnique({ where: { nom: dto.nom } });
    if (existing) throw new ConflictException(`La commune "${dto.nom}" existe déjà`);
    return this.db.commune.create({ data: dto });
  }

  async getStatsForInvestors() {
    // Tableau croisé : par commune → nb joueurs uniques + nb parcours terminés
    const stats = await this.db.commune.findMany({
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

    return stats.map((commune) => {
      const totalParcours = commune.parcours.length;
      const allPlayerIds = commune.parcours.flatMap((p) =>
        p.usersStats.map((s) => s.userId),
      );
      const uniquePlayers = new Set(allPlayerIds).size;
      const totalCompletions = allPlayerIds.length;

      return {
        id: commune.id,
        nom: commune.nom,
        codePostal: commune.codePostal,
        totalParcours,
        uniquePlayers,
        totalCompletions,
      };
    });
  }

  async findOne(id: string) {
    const commune = await this.db.commune.findUnique({ where: { id } });
    if (!commune) throw new NotFoundException(`Commune #${id} introuvable`);
    return commune;
  }
}
