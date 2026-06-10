import {
  Injectable,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import { CreateOrganismeDto } from './dto/create-organisme.dto';
import { PartialType } from '@nestjs/mapped-types';

export class UpdateOrganismeDto extends PartialType(CreateOrganismeDto) {}

@Injectable()
export class OrganismesService {
  constructor(private readonly db: DatabaseService) {}

  async findAll() {
    return this.db.organisme.findMany({
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
    const organisme = await this.db.organisme.findUnique({
      where: { id },
      include: {
        employes: {
          select: { id: true, email: true, firstName: true, lastName: true, role: true },
        },
      },
    });
    if (!organisme) throw new NotFoundException(`Organisme #${id} introuvable`);
    return organisme;
  }

  async create(dto: CreateOrganismeDto) {
    const existing = await this.db.organisme.findUnique({ where: { nom: dto.nom } });
    if (existing) throw new ConflictException(`Un organisme nommé "${dto.nom}" existe déjà`);
    return this.db.organisme.create({ data: dto });
  }

  async update(id: string, dto: UpdateOrganismeDto) {
    await this.findOne(id); // 404 si inexistante
    return this.db.organisme.update({ where: { id }, data: dto });
  }
}
