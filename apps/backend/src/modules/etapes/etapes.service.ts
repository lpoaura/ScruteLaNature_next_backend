import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import { CreateEtapeDto } from './dto/create-etape.dto';
import { UpdateEtapeDto } from './dto/update-etape.dto';
import { Role } from '@prisma/client';

@Injectable()
export class EtapesService {
  constructor(private readonly db: DatabaseService) {}

  /**
   * Vérifie que le parcours appartient bien à l'agence de l'utilisateur (si pas SUPER_ADMIN)
   */
  private async ensureParcoursAccess(
    parcoursId: string,
    userRole: Role,
    userAgenceId: string | null,
  ) {
    const parcours = await this.db.parcours.findUnique({
      where: { id: parcoursId },
      select: { agenceId: true },
    });

    if (!parcours) {
      throw new NotFoundException('Parcours introuvable');
    }

    if (userRole !== Role.SUPER_ADMIN) {
      if (!userAgenceId || parcours.agenceId !== userAgenceId) {
        throw new ForbiddenException(
          "Vous n'avez pas le droit de modifier les étapes d'un parcours hors de votre agence.",
        );
      }
    }
  }

  async create(
    createEtapeDto: CreateEtapeDto,
    userRole: Role,
    userAgenceId: string | null,
  ) {
    await this.ensureParcoursAccess(createEtapeDto.parcoursId, userRole, userAgenceId);

    return this.db.etape.create({
      data: createEtapeDto,
    });
  }

  async findAllByParcours(
    parcoursId: string,
    userRole: Role,
    userAgenceId: string | null,
  ) {
    await this.ensureParcoursAccess(parcoursId, userRole, userAgenceId);

    return this.db.etape.findMany({
      where: { parcoursId },
      orderBy: { order: 'asc' },
    });
  }

  async findOne(id: string, userRole: Role, userAgenceId: string | null) {
    const etape = await this.db.etape.findUnique({
      where: { id },
      include: { parcours: { select: { agenceId: true } } },
    });

    if (!etape) {
      throw new NotFoundException('Étape introuvable');
    }

    if (userRole !== Role.SUPER_ADMIN) {
      if (!userAgenceId || etape.parcours.agenceId !== userAgenceId) {
        throw new ForbiddenException("Accès refusé à cette étape.");
      }
    }

    return etape;
  }

  async update(
    id: string,
    updateEtapeDto: UpdateEtapeDto,
    userRole: Role,
    userAgenceId: string | null,
  ) {
    await this.findOne(id, userRole, userAgenceId); // Vérifie l'accès

    // Si on change l'étape de parcours (rare, mais possible), on vérifie les droits sur le nouveau parcours
    if (updateEtapeDto.parcoursId) {
      await this.ensureParcoursAccess(updateEtapeDto.parcoursId, userRole, userAgenceId);
    }

    return this.db.etape.update({
      where: { id },
      data: updateEtapeDto,
    });
  }

  async remove(id: string, userRole: Role, userAgenceId: string | null) {
    await this.findOne(id, userRole, userAgenceId); // Vérifie l'accès

    return this.db.etape.delete({
      where: { id },
    });
  }
}
