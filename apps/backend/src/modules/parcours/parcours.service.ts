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
import * as fs from 'fs';
import { join } from 'path';

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
    if (filters.zonageId) where.zonageId = filters.zonageId;

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
        zonage: { select: { id: true, nom: true } },
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
        zonage: true,
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
    // Vérification que la zonage existe
    const zonage = await this.db.zonage.findUnique({ where: { id: dto.zonageId } });
    if (!zonage) throw new NotFoundException(`Zonage #${dto.zonageId} introuvable`);

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
   * Nettoie physiquement une image spécifique si elle est remplacée ou supprimée.
   */
  private cleanupOldSpecificImage(oldUrl: string | null, newUrl?: string | null) {
    if (!oldUrl || oldUrl === newUrl) return;
    
    // Si l'ancienne image était une image spécifique, on la supprime
    if (oldUrl.includes('/specific_')) {
      const filename = oldUrl.split('/').pop();
      if (filename) {
        const subfolders = ['specific_images', 'specific_audio', 'specific_gpx'];
        for (const sub of subfolders) {
          const filePath = join(process.cwd(), 'uploads', sub, filename);
          if (fs.existsSync(filePath)) {
            try {
              fs.unlinkSync(filePath);
            } catch (err) {
              console.error(`Erreur lors de la suppression de ${filePath}`, err);
            }
            break;
          }
        }
      }
    }
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
    const existing = await this.findOne(id, userRole, userOrganismeId); // lève 404 ou 403

    const updated = await this.db.parcours.update({
      where: { id },
      data: dto,
    });

    // Nettoyage des anciennes images spécifiques si elles ont été modifiées
    if (dto.coverImage !== undefined) {
      this.cleanupOldSpecificImage(existing.coverImage, dto.coverImage);
    }
    if (dto.mascotteImg !== undefined) {
      this.cleanupOldSpecificImage(existing.mascotteImg, dto.mascotteImg);
    }

    return updated;
  }

  /**
   * Supprime un parcours (cascade sur étapes & jeux via Prisma)
   */
  async remove(id: string, userRole: Role, userOrganismeId: string | null) {
    const existing = await this.findOne(id, userRole, userOrganismeId); // lève 404 ou 403

    await this.db.parcours.delete({ where: { id } });

    // Nettoyage des images spécifiques associées au parcours supprimé
    this.cleanupOldSpecificImage(existing.coverImage, null);
    this.cleanupOldSpecificImage(existing.mascotteImg, null);

    return { message: `Parcours #${id} supprimé avec succès` };
  }
}
