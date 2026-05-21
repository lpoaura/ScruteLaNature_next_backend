import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Delete,
  Param,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { ZonagesService } from './zonages.service';
import { CreateZonageDto } from './dto/create-zonage.dto';
import { UpdateZonageDto } from './dto/update-zonage.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '@prisma/client';

@ApiTags('Zonages')
@ApiBearerAuth()
@Controller()
export class ZonagesController {
  constructor(private readonly zonagesService: ZonagesService) {}

  @Get('admin/zonages')
  @Roles(Role.EDITOR, Role.ADMIN, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Lister le référentiel des zonages (EDITOR/ADMIN/SUPER_ADMIN)' })
  @ApiResponse({ status: 200, description: 'Liste des zonages disponibles.' })
  findAll() {
    return this.zonagesService.findAll();
  }

  @Post('admin/zonages')
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Ajouter une zonage dans le référentiel (ADMIN/SUPER_ADMIN)' })
  @ApiResponse({ status: 201, description: 'Zonage ajoutée.' })
  @ApiResponse({ status: 409, description: 'Cette zonage existe déjà.' })
  create(@Body() dto: CreateZonageDto) {
    return this.zonagesService.create(dto);
  }

  @Patch('admin/zonages/:id')
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Modifier un zonage (ADMIN/SUPER_ADMIN)' })
  @ApiParam({ name: 'id', description: 'ID du zonage à modifier' })
  @ApiResponse({ status: 200, description: 'Zonage mis à jour.' })
  @ApiResponse({ status: 404, description: 'Zonage introuvable.' })
  @ApiResponse({ status: 409, description: 'Ce nom est déjà utilisé.' })
  update(@Param('id') id: string, @Body() dto: UpdateZonageDto) {
    return this.zonagesService.update(id, dto);
  }

  @Delete('admin/zonages/:id')
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Supprimer un zonage (ADMIN/SUPER_ADMIN)' })
  @ApiParam({ name: 'id', description: 'ID du zonage à supprimer' })
  @ApiResponse({ status: 200, description: 'Zonage supprimé.' })
  @ApiResponse({ status: 404, description: 'Zonage introuvable.' })
  @ApiResponse({ status: 409, description: 'Impossible de supprimer car rattaché à des parcours.' })
  remove(@Param('id') id: string) {
    return this.zonagesService.remove(id);
  }

  @Get('admin/stats/zonages')
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @ApiOperation({
    summary: 'Stats investisseurs : joueurs & parcours terminés par zonage (ADMIN/SUPER_ADMIN)',
  })
  @ApiResponse({
    status: 200,
    description: 'Tableau agrégé par zonage (nbJoueurs, nbCompletions, nbParcours).',
  })
  getStats() {
    return this.zonagesService.getStatsForInvestors();
  }

  @Get('admin/stats/dashboard')
  @Roles(Role.EDITOR, Role.ADMIN, Role.SUPER_ADMIN)
  @ApiOperation({
    summary: 'Stats globales pour le dashboard (EDITOR/ADMIN/SUPER_ADMIN)',
  })
  @ApiResponse({
    status: 200,
    description: 'KPIs globaux (parcours, joueurs, co2, communes).',
  })
  getDashboardStats() {
    return this.zonagesService.getGlobalDashboardStats();
  }
}
