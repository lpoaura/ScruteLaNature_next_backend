import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Query,
  UploadedFile,
  UseInterceptors,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiConsumes,
  ApiBody,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { MediasService } from './medias.service';
import { multerConfig } from './multer.config';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '@prisma/client';

@ApiTags('Médias')
@ApiBearerAuth()
@Controller('medias')
export class MediasController {
  constructor(private readonly mediasService: MediasService) {}

  @Post('upload')
  @Roles(Role.EDITOR, Role.ADMIN, Role.SUPER_ADMIN)
  @UseInterceptors(FileInterceptor('file', multerConfig))
  @ApiOperation({
    summary: 'Uploader et convertir automatiquement en WebP (ou audio/GPX) — EDITOR/ADMIN/SUPER_ADMIN',
    description:
      "Reçoit un fichier multimédia via multipart/form-data. " +
      "⚠️ FONCTIONnalité CLÉ : Tout fichier image (JPG, PNG, TIFF, GIF, AVIF, HEIC, BMP) est AUTOMATIQUEMENT converti au format optimisé WebP (qualité 85%) par le serveur. L'ancien format est supprimé et l'API retourne directement la nouvelle URL en .webp. " +
      "Les images sont limitées à 3 Mo. Les fichiers audio (.mp3, .wav) et tracés géographiques (.gpx) sont stockés respectivement sous /uploads/audio et /uploads/gpx (limite de 20 Mo).",
  })
  @ApiQuery({ name: 'context', required: false, description: 'Utiliser "specific" pour cacher le fichier de la galerie générale' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'Fichier source : Image (jpg, png, avif, heic, tiff, bmp -> auto-converti en WebP, 3 Mo max), ou Audio/GPX (20 Mo max)',
        },
      },
      required: ['file'],
    },
  })
  @ApiResponse({
    status: 201,
    description: "Fichier uploadé et converti en WebP avec succès. Retourne le nom du fichier converti et son URL publique.",
    schema: {
      example: {
        filename: 'a7b8e920-41c3-4d69-8e4a-9b8a2c1f3e4d.webp',
        originalName: 'oiseau_rare.webp',
        mimetype: 'image/webp',
        size: 78540,
        url: 'https://api.scrutelanature.lpo-aura.org/uploads/images/a7b8e920-41c3-4d69-8e4a-9b8a2c1f3e4d.webp',
      },
    },
  })
  @ApiResponse({ 
    status: 400, 
    description: 'Erreur de validation : aucun fichier fourni, type MIME non autorisé ou image > 3 Mo.',
    schema: {
      example: {
        statusCode: 400,
        message: "L'image ne doit pas dépasser 3 Mo. Veuillez la compresser.",
        error: "Bad Request"
      }
    }
  })
  async uploadFile(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('Aucun fichier fourni.');
    }
    
    // Vérification de la taille pour les images (3 Mo max)
    if (file.mimetype.startsWith('image/') && file.size > 3 * 1024 * 1024) {
      const fs = require('fs');
      if (fs.existsSync(file.path)) {
        fs.unlinkSync(file.path);
      }
      throw new BadRequestException('L\'image ne doit pas dépasser 3 Mo. Veuillez la compresser.');
    }
    
    return this.mediasService.processAndBuildUploadResponse(file);
  }

  @Get()
  @Roles(Role.EDITOR, Role.ADMIN, Role.SUPER_ADMIN)
  @ApiOperation({
    summary: 'Lister les médias du serveur avec pagination et filtrage',
    description:
      "Récupère l'ensemble des fichiers stockés physiquement sur le serveur d'hébergement. Permet de filtrer par catégorie (image en webp, audio en mp3, ou fichier gpx) et de trier par date d'ajout ou ordre alphabétique.",
  })
  @ApiQuery({ name: 'page',  required: false, type: Number, description: 'Numéro de la page (défaut: 1)' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Nombre de fichiers par page (défaut: 24)' })
  @ApiQuery({ name: 'type',  required: false, enum: ['image', 'audio', 'gpx'], description: 'Filtrer par catégorie (image retourne les .webp)' })
  @ApiQuery({ name: 'sortBy', required: false, enum: ['date', 'name'], description: 'Tri par date (plus récent) ou par nom de fichier' })
  @ApiResponse({
    status: 200,
    description: 'Liste paginée des médias et métadonnées.',
    schema: {
      example: {
        data: [
          {
            filename: 'a7b8e920-41c3-4d69-8e4a-9b8a2c1f3e4d.webp',
            url: 'https://api.scrutelanature.lpo-aura.org/uploads/images/a7b8e920-41c3-4d69-8e4a-9b8a2c1f3e4d.webp',
            size: 78540,
            mimetype: 'image/webp',
            createdAt: '2026-08-04T10:20:57.000Z',
            type: 'image'
          }
        ],
        meta: {
          total: 42,
          page: 1,
          limit: 24,
          totalPages: 2
        }
      }
    }
  })
  findAll(
    @Query('page')  page  = '1',
    @Query('limit') limit = '24',
    @Query('type')  type?: string,
    @Query('sortBy') sortBy?: string,
  ) {
    return this.mediasService.findAllFiles(+page, +limit, type, sortBy);
  }

  @Delete(':filename')
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @ApiOperation({
    summary: 'Supprimer physiquement un fichier du serveur — ADMIN/SUPER_ADMIN',
    description:
      "Supprime de manière permanente un fichier (ex: .webp, .mp3, .gpx) du disque du serveur. Le système vérifie de manière sécurisée contre les failles de type Path Traversal ('..', '/') avant de balayer les dossiers /images, /audio, et /gpx pour le purger.",
  })
  @ApiParam({ name: 'filename', description: 'Nom exact du fichier à supprimer (ex: a7b8e920-41c3-4d69-8e4a-9b8a2c1f3e4d.webp)' })
  @ApiResponse({
    status: 200,
    description: 'Le fichier a été trouvé et supprimé du disque avec succès.',
    schema: {
      example: {
        success: true,
        message: 'Fichier a7b8e920-41c3-4d69-8e4a-9b8a2c1f3e4d.webp supprimé avec succès.'
      }
    }
  })
  @ApiResponse({
    status: 400,
    description: "Tentative d'injection de chemin (Path Traversal) ou nom de fichier invalide."
  })
  @ApiResponse({
    status: 404,
    description: 'Fichier introuvable dans les répertoires de stockage du serveur.'
  })
  deleteFile(@Param('filename') filename: string) {
    return this.mediasService.deleteFile(filename);
  }
}
