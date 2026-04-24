import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import { CreateParcoursDto } from './dto/create-parcours.dto';
import { FilterParcoursDto } from './dto/filter-parcours.dto';
import { PartialType } from '@nestjs/mapped-types';
import { Role } from '@prisma/client';

export class UpdateParcoursDto extends PartialType(CreateParcoursDto) {}

@Injectable()
export class ParcoursService {
  constructor(private readonly db: DatabaseService) {}

  /**
   * Liste les parcours — cloisonnés par organisme sauf pour SUPER_ADMIN
   */
  async findAll(
    requestingUserId: string,
    userRole: Role,
    userOrganismeId: string | null,
    filters: FilterParcoursDto,
  ) {
    const where: any = {};

    // Cloisonnement par organisme : un ADMIN/EDITOR ne voit que sa région
    if (userRole !== Role.SUPER_ADMIN) {
      if (!userOrganismeId) {
        throw new ForbiddenException('Vous n\'êtes rattaché à aucune organisme.');
      }
      where.organismeId = userOrganismeId;
    }

    // Application des filtres optionnels
    if (filters.status) where.status = filters.status;
    if (filters.difficulty) where.difficulty = filters.difficulty;
    if (filters.communeId) where.communeId = filters.communeId;

    return this.db.parcours.findMany({
      where,
      select: {
        id: true,
        title: true,
        status: true,
        difficulty: true,
        distanceKm: true,
        durationMin: true,
        coverImage: true,
        commune: { select: { id: true, nom: true } },
        organisme: { select: { id: true, nom: true } },
        _count: { select: { etapes: true, reviews: true } },
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { updatedAt: 'desc' },
    });
  }

  /**
   * Détail complet d'un parcours avec étapes et jeux (pour l'éditeur backoffice)
   */
  async findOne(id: string, userRole: Role, userOrganismeId: string | null) {
    const parcours = await this.db.parcours.findUnique({
      where: { id },
      include: {
        commune: true,
        organisme: true,
        etapes: {
          include: { jeux: { orderBy: { order: 'asc' } } },
          orderBy: { order: 'asc' },
        },
      },
    });

    if (!parcours) throw new NotFoundException(`Parcours #${id} introuvable`);

    // Cloisonnement : vérification que l'admin appartient à la bonne organisme
    if (userRole !== Role.SUPER_ADMIN && parcours.organismeId !== userOrganismeId) {
      throw new ForbiddenException('Ce parcours n\'appartient pas à votre organisme.');
    }

    return parcours;
  }

  /**
   * Crée un nouveau parcours — l'organismeId est déduit du compte connecté
   */
  async create(dto: CreateParcoursDto, userRole: Role, userOrganismeId: string | null) {
    // Vérification que la commune existe
    const commune = await this.db.commune.findUnique({ where: { id: dto.communeId } });
    if (!commune) throw new NotFoundException(`Commune #${dto.communeId} introuvable`);

    // Détermination de l'organisme
    let organismeId: string;
    if (userRole === Role.SUPER_ADMIN) {
      // Le SUPER_ADMIN doit préciser l'organisme via query param (implémenté dans le controller)
      if (!userOrganismeId) throw new ForbiddenException('Précisez l\'organismeId pour le SUPER_ADMIN');
      organismeId = userOrganismeId;
    } else {
      if (!userOrganismeId) throw new ForbiddenException('Vous n\'êtes rattaché à aucune organisme.');
      organismeId = userOrganismeId;
    }

    return this.db.parcours.create({
      data: {
        ...dto,
        organismeId,
      },
    });
  }

  /**
   * Met à jour un parcours (avec vérification de propriété)
   */
  async update(
    id: string,
    dto: UpdateParcoursDto,
    userRole: Role,
    userOrganismeId: string | null,
  ) {
    await this.findOne(id, userRole, userOrganismeId); // lève 404 ou 403

    return this.db.parcours.update({
      where: { id },
      data: dto,
    });
  }

  /**
   * Supprime un parcours (cascade sur étapes & jeux via Prisma)
   */
  async remove(id: string, userRole: Role, userOrganismeId: string | null) {
    await this.findOne(id, userRole, userOrganismeId); // lève 404 ou 403

    await this.db.parcours.delete({ where: { id } });
    return { message: `Parcours #${id} supprimé avec succès` };
  }
}
