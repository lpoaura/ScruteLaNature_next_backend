import {
  Injectable,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import { CreateAgenceDto } from './dto/create-agence.dto';
import { PartialType } from '@nestjs/mapped-types';

export class UpdateAgenceDto extends PartialType(CreateAgenceDto) {}

@Injectable()
export class AgencesService {
  constructor(private readonly db: DatabaseService) {}

  async findAll() {
    return this.db.agence.findMany({
      select: {
        id: true,
        nom: true,
        createdAt: true,
        _count: { select: { employes: true, parcours: true } },
      },
      orderBy: { nom: 'asc' },
    });
  }

  async findOne(id: string) {
    const agence = await this.db.agence.findUnique({
      where: { id },
      include: {
        employes: {
          select: { id: true, email: true, firstName: true, lastName: true, role: true },
        },
      },
    });
    if (!agence) throw new NotFoundException(`Agence #${id} introuvable`);
    return agence;
  }

  async create(dto: CreateAgenceDto) {
    const existing = await this.db.agence.findUnique({ where: { nom: dto.nom } });
    if (existing) throw new ConflictException(`Une agence nommée "${dto.nom}" existe déjà`);
    return this.db.agence.create({ data: dto });
  }

  async update(id: string, dto: UpdateAgenceDto) {
    await this.findOne(id); // 404 si inexistante
    return this.db.agence.update({ where: { id }, data: dto });
  }
}
