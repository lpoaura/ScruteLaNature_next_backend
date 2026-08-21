import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  Request,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { ParcoursService, UpdateParcoursDto } from './parcours.service';
import { CreateParcoursDto } from './dto/create-parcours.dto';
import { FilterParcoursDto } from './dto/filter-parcours.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '@prisma/client';

@ApiTags('Parcours (Admin)')
@ApiBearerAuth()
@Controller('admin/parcours')
export class ParcoursController {
  constructor(private readonly parcoursService: ParcoursService) {}

  @Get()
  @Roles(Role.EDITOR, Role.ADMIN, Role.SUPER_ADMIN)
  @ApiOperation({
    summary: 'Lister les parcours de l\'organisme avec filtres (EDITOR/ADMIN/SUPER_ADMIN)',
  })
  @ApiQuery({ name: 'status', required: false, enum: ['DRAFT', 'PUBLISHED', 'ARCHIVED'] })
  @ApiQuery({ name: 'difficulty', required: false, enum: ['FACILE', 'MOYEN', 'DIFFICILE'] })
  @ApiQuery({ name: 'zonageId', required: false, type: String })
  @ApiResponse({ status: 200, description: 'Liste des parcours.' })
  findAll(@Request() req: any, @Query() filters: FilterParcoursDto) {
    console.log('--- DEBUG USER IN PARCOURS CONTROLLER ---', req.user);
    return this.parcoursService.findAll(
      req.user.id,
      req.user.role,
      req.user.organismeId ?? null,
      filters,
    );
  }

  @Get(':id')
  @Roles(Role.EDITOR, Role.ADMIN, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Détail complet d\'un parcours avec étapes et jeux' })
  @ApiParam({ name: 'id', description: 'UUID du parcours' })
  @ApiResponse({ status: 200, description: 'Données complètes du parcours.' })
  @ApiResponse({ status: 403, description: 'Parcours hors de votre organisme.' })
  @ApiResponse({ status: 404, description: 'Parcours introuvable.' })
  findOne(@Param('id') id: string, @Request() req: any) {
    return this.parcoursService.findOne(id, req.user.role, req.user.organismeId ?? null);
  }

  @Post()
  @Roles(Role.EDITOR, Role.ADMIN, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Créer un nouveau parcours (rattaché à l\'organisme du créateur)' })
  @ApiResponse({ status: 201, description: 'Parcours créé en statut DRAFT.' })
  @ApiResponse({ status: 404, description: 'Zonage introuvable.' })
  @ApiQuery({ name: 'organismeId', required: false, description: 'Obligatoire pour les SUPER_ADMIN. Ignoré pour les autres rôles.' })
  create(@Body() dto: CreateParcoursDto, @Query('organismeId') queryOrganismeId: string, @Request() req: any) {
    const orgId = req.user.role === Role.SUPER_ADMIN ? queryOrganismeId : (req.user.organismeId ?? null);
    return this.parcoursService.create(dto, req.user.role, orgId, req.user.id);
  }

  @Patch(':id')
  @Roles(Role.EDITOR, Role.ADMIN, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Mettre à jour un parcours (titre, zonage, accessibilité, statut)' })
  @ApiParam({ name: 'id', description: 'UUID du parcours' })
  @ApiQuery({ name: 'organismeId', required: false, description: 'Pour changer l\'organisme (SUPER_ADMIN uniquement)' })
  @ApiResponse({ status: 200, description: 'Parcours mis à jour.' })
  @ApiResponse({ status: 403, description: 'Parcours hors de votre organisme.' })
  @ApiResponse({ status: 404, description: 'Parcours introuvable.' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateParcoursDto,
    @Query('organismeId') queryOrganismeId: string,
    @Request() req: any,
  ) {
    return this.parcoursService.update(id, dto, req.user.role, req.user.organismeId ?? null, queryOrganismeId);
  }

  @Patch(':id/request-publish')
  @Roles(Role.EDITOR, Role.ADMIN, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Soumettre un parcours pour publication (→ PENDING_REVIEW)' })
  @ApiParam({ name: 'id', description: 'UUID du parcours' })
  @ApiResponse({ status: 200, description: 'Statut passé à PENDING_REVIEW.' })
  @ApiResponse({ status: 403, description: 'Déjà publié ou déjà en attente.' })
  requestPublish(@Param('id') id: string, @Request() req: any) {
    return this.parcoursService.requestPublish(id, req.user.role, req.user.organismeId ?? null);
  }

  @Delete(':id')
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Supprimer définitivement un parcours — ADMIN/SUPER_ADMIN' })
  @ApiParam({ name: 'id', description: 'UUID du parcours' })
  @ApiResponse({ status: 200, description: 'Parcours supprimé (cascade étapes + jeux).' })
  @ApiResponse({ status: 403, description: 'Accès refusé.' })
  @ApiResponse({ status: 404, description: 'Parcours introuvable.' })
  remove(@Param('id') id: string, @Request() req: any) {
    return this.parcoursService.remove(id, req.user.role, req.user.organismeId ?? null);
  }
}
