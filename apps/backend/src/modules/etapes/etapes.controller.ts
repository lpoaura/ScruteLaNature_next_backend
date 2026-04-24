import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Request,
} from '@nestjs/common';
import { EtapesService } from './etapes.service';
import { CreateEtapeDto } from './dto/create-etape.dto';
import { UpdateEtapeDto } from './dto/update-etape.dto';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '@prisma/client';

@ApiTags('Étapes (Admin)')
@ApiBearerAuth()
@Controller('admin/etapes')
export class EtapesController {
  constructor(private readonly etapesService: EtapesService) {}

  @Post()
  @Roles(Role.EDITOR, Role.ADMIN, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Créer une nouvelle étape dans un parcours' })
  @ApiResponse({ status: 201, description: 'Étape créée avec succès.' })
  @ApiResponse({ status: 403, description: 'Parcours hors de votre organisme.' })
  @ApiResponse({ status: 404, description: 'Parcours introuvable.' })
  create(@Body() createEtapeDto: CreateEtapeDto, @Request() req: any) {
    return this.etapesService.create(
      createEtapeDto,
      req.user.role,
      req.user.organismeId ?? null,
    );
  }

  @Get('parcours/:parcoursId')
  @Roles(Role.EDITOR, Role.ADMIN, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Lister toutes les étapes d\'un parcours spécifique' })
  @ApiParam({ name: 'parcoursId', description: 'UUID du parcours' })
  @ApiResponse({ status: 200, description: 'Liste des étapes triées par ordre.' })
  findAllByParcours(@Param('parcoursId') parcoursId: string, @Request() req: any) {
    return this.etapesService.findAllByParcours(
      parcoursId,
      req.user.role,
      req.user.organismeId ?? null,
    );
  }

  @Get(':id')
  @Roles(Role.EDITOR, Role.ADMIN, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Récupérer les détails d\'une étape spécifique' })
  @ApiParam({ name: 'id', description: 'UUID de l\'étape' })
  @ApiResponse({ status: 200, description: 'Détails de l\'étape.' })
  @ApiResponse({ status: 404, description: 'Étape introuvable.' })
  findOne(@Param('id') id: string, @Request() req: any) {
    return this.etapesService.findOne(
      id,
      req.user.role,
      req.user.organismeId ?? null,
    );
  }

  @Patch(':id')
  @Roles(Role.EDITOR, Role.ADMIN, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Mettre à jour une étape (titre, GPS, ordre, etc.)' })
  @ApiParam({ name: 'id', description: 'UUID de l\'étape' })
  @ApiResponse({ status: 200, description: 'Étape mise à jour.' })
  @ApiResponse({ status: 403, description: 'Accès refusé.' })
  @ApiResponse({ status: 404, description: 'Étape introuvable.' })
  update(
    @Param('id') id: string,
    @Body() updateEtapeDto: UpdateEtapeDto,
    @Request() req: any,
  ) {
    return this.etapesService.update(
      id,
      updateEtapeDto,
      req.user.role,
      req.user.organismeId ?? null,
    );
  }

  @Delete(':id')
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Supprimer une étape (cascade les jeux associés) — ADMIN/SUPER_ADMIN' })
  @ApiParam({ name: 'id', description: 'UUID de l\'étape' })
  @ApiResponse({ status: 200, description: 'Étape supprimée.' })
  @ApiResponse({ status: 403, description: 'Accès refusé.' })
  @ApiResponse({ status: 404, description: 'Étape introuvable.' })
  remove(@Param('id') id: string, @Request() req: any) {
    return this.etapesService.remove(
      id,
      req.user.role,
      req.user.organismeId ?? null,
    );
  }
}
