import {
  Controller,
  Post,
  Delete,
  Param,
  UploadedFile,
  UseInterceptors,
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
    summary: 'Uploader un fichier (image, audio mp3, fichier GPX) — EDITOR/ADMIN/SUPER_ADMIN',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'Fichier à uploader (jpg, png, webp, mp3, gpx — 20Mo max)',
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Fichier uploadé. Retourne le nom du fichier et son URL publique.',
    schema: {
      example: {
        filename: 'uuid-generated.jpg',
        originalName: 'cover.jpg',
        mimetype: 'image/jpeg',
        size: 102400,
        url: 'http://localhost:3000/uploads/images/uuid-generated.jpg',
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Type de fichier non supporté ou aucun fichier.' })
  uploadFile(@UploadedFile() file: Express.Multer.File) {
    return this.mediasService.buildUploadResponse(file);
  }

  @Delete(':filename')
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @ApiOperation({
    summary: 'Supprimer physiquement un fichier du serveur — ADMIN/SUPER_ADMIN',
  })
  @ApiParam({ name: 'filename', description: 'Nom du fichier (ex: uuid.jpg)' })
  @ApiResponse({ status: 200, description: 'Fichier supprimé.' })
  @ApiResponse({ status: 404, description: 'Fichier introuvable.' })
  deleteFile(@Param('filename') filename: string) {
    return this.mediasService.deleteFile(filename);
  }
}
