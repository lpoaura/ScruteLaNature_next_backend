import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { AgencesService, UpdateAgenceDto } from './agences.service';
import { CreateAgenceDto } from './dto/create-agence.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '@prisma/client';

@ApiTags('Agences')
@ApiBearerAuth()
@Controller('admin/agences')
export class AgencesController {
  constructor(private readonly agencesService: AgencesService) {}

  @Get()
  @Roles(Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Lister toutes les agences régionales LPO (SUPER_ADMIN)' })
  @ApiResponse({ status: 200, description: 'Liste des agences avec nombre d\'employés et de parcours.' })
  findAll() {
    return this.agencesService.findAll();
  }

  @Get(':id')
  @Roles(Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Détail d\'une agence avec ses employés (SUPER_ADMIN)' })
  @ApiParam({ name: 'id', description: 'UUID de l\'agence' })
  @ApiResponse({ status: 200, description: 'Détail de l\'agence.' })
  @ApiResponse({ status: 404, description: 'Agence introuvable.' })
  findOne(@Param('id') id: string) {
    return this.agencesService.findOne(id);
  }

  @Post()
  @Roles(Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Créer une nouvelle agence régionale (SUPER_ADMIN)' })
  @ApiResponse({ status: 201, description: 'Agence créée.' })
  @ApiResponse({ status: 409, description: 'Une agence avec ce nom existe déjà.' })
  create(@Body() dto: CreateAgenceDto) {
    return this.agencesService.create(dto);
  }

  @Patch(':id')
  @Roles(Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Modifier le nom d\'une agence (SUPER_ADMIN)' })
  @ApiParam({ name: 'id', description: 'UUID de l\'agence' })
  @ApiResponse({ status: 200, description: 'Agence mise à jour.' })
  @ApiResponse({ status: 404, description: 'Agence introuvable.' })
  update(@Param('id') id: string, @Body() dto: UpdateAgenceDto) {
    return this.agencesService.update(id, dto);
  }
}
