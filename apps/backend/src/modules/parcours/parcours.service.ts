import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import { CreateParcoursDto } from './dto/create-parcours.dto';
import { FilterParcoursDto } from './dto/filter-parcours.dto';
import { PartialType } from '@nestjs/mapped-types';
import { Role, PublishStatus } from '@prisma/client';
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

    // Cloisonnement par organisme
    if (userRole !== Role.SUPER_ADMIN) {
      if (!userOrganismeId) {
        throw new ForbiddenException('Vous n\'êtes rattaché à aucune organisme.');
      }
      where.organismeId = userOrganismeId;
    }

    if (filters.status) where.status = filters.status;
    if (filters.difficulty) where.difficulty = filters.difficulty;
    if (filters.zonageId) where.zonageId = filters.zonageId;
    if (filters.organismeId && userRole === Role.SUPER_ADMIN) where.organismeId = filters.organismeId;

    const page  = filters.page  ?? 1;
    const limit = filters.limit ?? 15;
    const skip  = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.db.parcours.findMany({
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
          createdBy: userRole === Role.SUPER_ADMIN
            ? { select: { id: true, firstName: true, lastName: true, email: true } }
            : false,
          _count: { select: { etapes: true, reviews: true } },
          createdAt: true,
          updatedAt: true,
        },
        orderBy: { updatedAt: 'desc' },
        skip,
        take: limit,
      }),
      this.db.parcours.count({ where }),
    ]);

    return {
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
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
  async create(dto: CreateParcoursDto, userRole: Role, userOrganismeId: string | null, createdById?: string) {
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
        ...(createdById ? { createdById } : {}),
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
   * Met à jour un parcours (avec vérification de propriété et de rôle sur le statut)
   */
  async update(
    id: string,
    dto: UpdateParcoursDto,
    userRole: Role,
    userOrganismeId: string | null,
  ) {
    const existing = await this.findOne(id, userRole, userOrganismeId); // lève 404 ou 403

    // Un parcours publié ne peut pas être modifié par un ADMIN ou EDITOR
    if (existing.status === PublishStatus.PUBLISHED && userRole !== Role.SUPER_ADMIN) {
      throw new ForbiddenException('Un parcours publié ne peut pas être modifié. Contactez un Super Admin.');
    }

    // Un EDITOR ne peut jamais toucher au statut
    if (dto.status !== undefined && userRole === Role.EDITOR) {
      throw new ForbiddenException('Les éditeurs ne peuvent pas modifier le statut d\'un parcours.');
    }

    // Un ADMIN ne peut pas publier directement
    if (dto.status === PublishStatus.PUBLISHED && userRole === Role.ADMIN) {
      throw new ForbiddenException('Seul un Super Admin peut publier un parcours.');
    }

    // Exclure le champ status du dto pour EDITOR (double sécurité)
    const safeDto = userRole === Role.EDITOR ? (({ status, ...rest }) => rest)(dto as any) : dto;

    const updated = await this.db.parcours.update({
      where: { id },
      data: safeDto,
    });

    // Nettoyage des anciennes images spécifiques si elles ont été modifiées
    if (safeDto.coverImage !== undefined) {
      this.cleanupOldSpecificImage(existing.coverImage, safeDto.coverImage);
    }
    if (safeDto.mascotteImg !== undefined) {
      this.cleanupOldSpecificImage(existing.mascotteImg, safeDto.mascotteImg);
    }

    return updated;
  }

  /**
   * Soumet un parcours pour relecture (EDITOR/ADMIN → PENDING_REVIEW)
   */
  async requestPublish(id: string, userRole: Role, userOrganismeId: string | null) {
    const existing = await this.findOne(id, userRole, userOrganismeId); // lève 404 ou 403

    if (existing.status === PublishStatus.PUBLISHED) {
      throw new ForbiddenException('Ce parcours est déjà publié.');
    }
    if (existing.status === PublishStatus.PENDING_REVIEW) {
      throw new ForbiddenException('Une demande de publication est déjà en cours.');
    }

    return this.db.parcours.update({
      where: { id },
      data: { status: PublishStatus.PENDING_REVIEW },
      select: { id: true, status: true, title: true },
    });
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
