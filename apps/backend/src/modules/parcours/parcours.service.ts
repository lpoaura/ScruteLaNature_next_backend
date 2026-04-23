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
   * Liste les parcours — cloisonnés par agence sauf pour SUPER_ADMIN
   */
  async findAll(
    requestingUserId: string,
    userRole: Role,
    userAgenceId: string | null,
    filters: FilterParcoursDto,
  ) {
    const where: any = {};

    // Cloisonnement par agence : un ADMIN/EDITOR ne voit que sa région
    if (userRole !== Role.SUPER_ADMIN) {
      if (!userAgenceId) {
        throw new ForbiddenException('Vous n\'êtes rattaché à aucune agence.');
      }
      where.agenceId = userAgenceId;
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
        agence: { select: { id: true, nom: true } },
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
  async findOne(id: string, userRole: Role, userAgenceId: string | null) {
    const parcours = await this.db.parcours.findUnique({
      where: { id },
      include: {
        commune: true,
        agence: true,
        etapes: {
          include: { jeux: { orderBy: { order: 'asc' } } },
          orderBy: { order: 'asc' },
        },
      },
    });

    if (!parcours) throw new NotFoundException(`Parcours #${id} introuvable`);

    // Cloisonnement : vérification que l'admin appartient à la bonne agence
    if (userRole !== Role.SUPER_ADMIN && parcours.agenceId !== userAgenceId) {
      throw new ForbiddenException('Ce parcours n\'appartient pas à votre agence.');
    }

    return parcours;
  }

  /**
   * Crée un nouveau parcours — l'agenceId est déduit du compte connecté
   */
  async create(dto: CreateParcoursDto, userRole: Role, userAgenceId: string | null) {
    // Vérification que la commune existe
    const commune = await this.db.commune.findUnique({ where: { id: dto.communeId } });
    if (!commune) throw new NotFoundException(`Commune #${dto.communeId} introuvable`);

    // Détermination de l'agence
    let agenceId: string;
    if (userRole === Role.SUPER_ADMIN) {
      // Le SUPER_ADMIN doit préciser l'agence via query param (implémenté dans le controller)
      if (!userAgenceId) throw new ForbiddenException('Précisez l\'agenceId pour le SUPER_ADMIN');
      agenceId = userAgenceId;
    } else {
      if (!userAgenceId) throw new ForbiddenException('Vous n\'êtes rattaché à aucune agence.');
      agenceId = userAgenceId;
    }

    return this.db.parcours.create({
      data: {
        ...dto,
        agenceId,
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
    userAgenceId: string | null,
  ) {
    await this.findOne(id, userRole, userAgenceId); // lève 404 ou 403

    return this.db.parcours.update({
      where: { id },
      data: dto,
    });
  }

  /**
   * Supprime un parcours (cascade sur étapes & jeux via Prisma)
   */
  async remove(id: string, userRole: Role, userAgenceId: string | null) {
    await this.findOne(id, userRole, userAgenceId); // lève 404 ou 403

    await this.db.parcours.delete({ where: { id } });
    return { message: `Parcours #${id} supprimé avec succès` };
  }
}
