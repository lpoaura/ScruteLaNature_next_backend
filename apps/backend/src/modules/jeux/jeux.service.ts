import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import { CreateJeuDto } from './dto/create-jeux.dto';
import { UpdateJeuDto } from './dto/update-jeux.dto';
import { Role } from '@prisma/client';

@Injectable()
export class JeuxService {
  constructor(private readonly db: DatabaseService) {}

  /**
   * Vérifie que l'étape (et donc le parcours) appartient à l'organisme de l'utilisateur.
   */
  private async ensureEtapeAccess(
    etapeId: string,
    userRole: Role,
    userOrganismeId: string | null,
  ) {
    const etape = await this.db.etape.findUnique({
      where: { id: etapeId },
      include: { parcours: { select: { organismeId: true } } },
    });

    if (!etape) {
      throw new NotFoundException('Étape introuvable');
    }

    if (userRole !== Role.SUPER_ADMIN) {
      if (!userOrganismeId || etape.parcours.organismeId !== userOrganismeId) {
        throw new ForbiddenException(
          "Vous n'avez pas le droit de modifier les jeux d'un parcours hors de votre organisme.",
        );
      }
    }
  }

  async create(
    createJeuDto: CreateJeuDto,
    userRole: Role,
    userOrganismeId: string | null,
  ) {
    await this.ensureEtapeAccess(createJeuDto.etapeId, userRole, userOrganismeId);

    // Prisma attend JsonValue (un type natif), Record<string, any> est compatible si non undefined
    // On convertit le DTO pour qu'il soit bien typé
    return this.db.jeu.create({
      data: {
        ...createJeuDto,
        donneesJeu: createJeuDto.donneesJeu ? createJeuDto.donneesJeu : undefined,
      },
    });
  }

  async findAllByEtape(
    etapeId: string,
    userRole: Role,
    userOrganismeId: string | null,
  ) {
    await this.ensureEtapeAccess(etapeId, userRole, userOrganismeId);

    return this.db.jeu.findMany({
      where: { etapeId },
      orderBy: { order: 'asc' },
    });
  }

  async findOne(id: string, userRole: Role, userOrganismeId: string | null) {
    const jeu = await this.db.jeu.findUnique({
      where: { id },
      include: { etape: { include: { parcours: { select: { organismeId: true } } } } },
    });

    if (!jeu) {
      throw new NotFoundException('Jeu introuvable');
    }

    if (userRole !== Role.SUPER_ADMIN) {
      if (!userOrganismeId || jeu.etape.parcours.organismeId !== userOrganismeId) {
        throw new ForbiddenException("Accès refusé à ce jeu.");
      }
    }

    return jeu;
  }

  async update(
    id: string,
    updateJeuDto: UpdateJeuDto,
    userRole: Role,
    userOrganismeId: string | null,
  ) {
    await this.findOne(id, userRole, userOrganismeId); // Vérifie l'accès

    if (updateJeuDto.etapeId) {
      await this.ensureEtapeAccess(updateJeuDto.etapeId, userRole, userOrganismeId);
    }

    return this.db.jeu.update({
      where: { id },
      data: {
        ...updateJeuDto,
        donneesJeu: updateJeuDto.donneesJeu !== undefined ? updateJeuDto.donneesJeu : undefined,
      },
    });
  }

  async remove(id: string, userRole: Role, userOrganismeId: string | null) {
    await this.findOne(id, userRole, userOrganismeId);

    return this.db.jeu.delete({
      where: { id },
    });
  }
}
