import {
  Controller,
  Get,
  Post,
  Body,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { CommunesService } from './communes.service';
import { CreateCommuneDto } from './dto/create-commune.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '@prisma/client';

@ApiTags('Communes')
@ApiBearerAuth()
@Controller()
export class CommunesController {
  constructor(private readonly communesService: CommunesService) {}

  @Get('admin/communes')
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Lister le référentiel des communes (ADMIN/SUPER_ADMIN)' })
  @ApiResponse({ status: 200, description: 'Liste des communes disponibles.' })
  findAll() {
    return this.communesService.findAll();
  }

  @Post('admin/communes')
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Ajouter une commune dans le référentiel (ADMIN/SUPER_ADMIN)' })
  @ApiResponse({ status: 201, description: 'Commune ajoutée.' })
  @ApiResponse({ status: 409, description: 'Cette commune existe déjà.' })
  create(@Body() dto: CreateCommuneDto) {
    return this.communesService.create(dto);
  }

  @Get('admin/stats/communes')
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @ApiOperation({
    summary: 'Stats investisseurs : joueurs & parcours terminés par commune (ADMIN/SUPER_ADMIN)',
  })
  @ApiResponse({
    status: 200,
    description: 'Tableau agrégé par commune (nbJoueurs, nbCompletions, nbParcours).',
  })
  getStats() {
    return this.communesService.getStatsForInvestors();
  }
}
