import {
  Controller,
  Get,
  Post,
  Body,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { ZonagesService } from './zonages.service';
import { CreateZonageDto } from './dto/create-zonage.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '@prisma/client';

@ApiTags('Zonages')
@ApiBearerAuth()
@Controller()
export class ZonagesController {
  constructor(private readonly zonagesService: ZonagesService) {}

  @Get('admin/zonages')
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Lister le référentiel des zonages (ADMIN/SUPER_ADMIN)' })
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
