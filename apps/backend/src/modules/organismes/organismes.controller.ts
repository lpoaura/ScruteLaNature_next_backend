import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { OrganismesService, UpdateOrganismeDto } from './organismes.service';
import { CreateOrganismeDto } from './dto/create-organisme.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '@prisma/client';

@ApiTags('Organismes')
@ApiBearerAuth()
@Controller('admin/organismes')
export class OrganismesController {
  constructor(private readonly organismesService: OrganismesService) {}

  @Get()
  @Roles(Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Lister tous les organismes (zonages) LPO (SUPER_ADMIN)' })
  @ApiResponse({ status: 200, description: 'Liste des organismes avec nombre d\'employés et de parcours.' })
  findAll() {
    return this.organismesService.findAll();
  }

  @Get(':id')
  @Roles(Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Détail d\'un organisme avec ses employés (SUPER_ADMIN)' })
  @ApiParam({ name: 'id', description: 'UUID de l\'organisme' })
  @ApiResponse({ status: 200, description: 'Détail de l\'organisme.' })
  @ApiResponse({ status: 404, description: 'Organisme introuvable.' })
  findOne(@Param('id') id: string) {
    return this.organismesService.findOne(id);
  }

  @Post()
  @Roles(Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Créer un nouvel organisme (zonage) (SUPER_ADMIN)' })
  @ApiResponse({ status: 201, description: 'Organisme créé.' })
  @ApiResponse({ status: 409, description: 'Un organisme avec ce nom existe déjà.' })
  create(@Body() dto: CreateOrganismeDto) {
    return this.organismesService.create(dto);
  }

  @Patch(':id')
  @Roles(Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Modifier le nom d\'un organisme (SUPER_ADMIN)' })
  @ApiParam({ name: 'id', description: 'UUID de l\'organisme' })
  @ApiResponse({ status: 200, description: 'Organisme mis à jour.' })
  @ApiResponse({ status: 404, description: 'Organisme introuvable.' })
  update(@Param('id') id: string, @Body() dto: UpdateOrganismeDto) {
    return this.organismesService.update(id, dto);
  }
}
