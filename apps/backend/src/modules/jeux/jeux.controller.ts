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
import { JeuxService } from './jeux.service';
import { CreateJeuDto } from './dto/create-jeux.dto';
import { UpdateJeuDto } from './dto/update-jeux.dto';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '@prisma/client';

@ApiTags('Jeux (Admin)')
@ApiBearerAuth()
@Controller('admin/jeux')
export class JeuxController {
  constructor(private readonly jeuxService: JeuxService) {}

  @Post()
  @Roles(Role.EDITOR, Role.ADMIN, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Créer un nouveau jeu associé à une étape' })
  @ApiResponse({ status: 201, description: 'Jeu créé avec succès.' })
  @ApiResponse({ status: 403, description: 'Étape hors de votre agence.' })
  @ApiResponse({ status: 404, description: 'Étape introuvable.' })
  create(@Body() createJeuDto: CreateJeuDto, @Request() req: any) {
    return this.jeuxService.create(
      createJeuDto,
      req.user.role,
      req.user.agenceId ?? null,
    );
  }

  @Get('etape/:etapeId')
  @Roles(Role.EDITOR, Role.ADMIN, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Lister tous les jeux d\'une étape spécifique' })
  @ApiParam({ name: 'etapeId', description: 'UUID de l\'étape' })
  @ApiResponse({ status: 200, description: 'Liste des jeux triés par ordre.' })
  findAllByEtape(@Param('etapeId') etapeId: string, @Request() req: any) {
    return this.jeuxService.findAllByEtape(
      etapeId,
      req.user.role,
      req.user.agenceId ?? null,
    );
  }

  @Get(':id')
  @Roles(Role.EDITOR, Role.ADMIN, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Récupérer les détails d\'un jeu spécifique' })
  @ApiParam({ name: 'id', description: 'UUID du jeu' })
  @ApiResponse({ status: 200, description: 'Détails du jeu.' })
  @ApiResponse({ status: 404, description: 'Jeu introuvable.' })
  findOne(@Param('id') id: string, @Request() req: any) {
    return this.jeuxService.findOne(
      id,
      req.user.role,
      req.user.agenceId ?? null,
    );
  }

  @Patch(':id')
  @Roles(Role.EDITOR, Role.ADMIN, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Mettre à jour un jeu (type, question, JSON de données, etc.)' })
  @ApiParam({ name: 'id', description: 'UUID du jeu' })
  @ApiResponse({ status: 200, description: 'Jeu mis à jour.' })
  @ApiResponse({ status: 403, description: 'Accès refusé.' })
  @ApiResponse({ status: 404, description: 'Jeu introuvable.' })
  update(
    @Param('id') id: string,
    @Body() updateJeuDto: UpdateJeuDto,
    @Request() req: any,
  ) {
    return this.jeuxService.update(
      id,
      updateJeuDto,
      req.user.role,
      req.user.agenceId ?? null,
    );
  }

  @Delete(':id')
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Supprimer un jeu — ADMIN/SUPER_ADMIN' })
  @ApiParam({ name: 'id', description: 'UUID du jeu' })
  @ApiResponse({ status: 200, description: 'Jeu supprimé.' })
  @ApiResponse({ status: 403, description: 'Accès refusé.' })
  @ApiResponse({ status: 404, description: 'Jeu introuvable.' })
  remove(@Param('id') id: string, @Request() req: any) {
    return this.jeuxService.remove(
      id,
      req.user.role,
      req.user.agenceId ?? null,
    );
  }
}
