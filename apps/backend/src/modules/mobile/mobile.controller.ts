import { Controller, Get, Query, Param } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { MobileService } from './mobile.service';
import { SearchParcoursDto } from './dto/search-parcours.dto';
import { NearbyParcoursDto } from './dto/nearby-parcours.dto';

@ApiTags('Mobile')
@ApiBearerAuth()
@Controller('mobile/parcours')
export class MobileController {
  constructor(private readonly mobileService: MobileService) {}

  @Get('search')
  @ApiOperation({
    summary:
      'Recherche de parcours publiés par commune et/ou accessibilité (joueur / invité)',
    description:
      'Route accessible aux joueurs authentifiés (y compris mode Invité). Retourne uniquement les parcours au statut PUBLISHED.',
  })
  @ApiQuery({ name: 'communeId', required: false, type: String })
  @ApiQuery({ name: 'isPMRFriendly', required: false, type: Boolean })
  @ApiQuery({ name: 'isChildFriendly', required: false, type: Boolean })
  @ApiQuery({ name: 'isMentalHandicapFriendly', required: false, type: Boolean })
  @ApiResponse({
    status: 200,
    description: 'Liste des parcours publiés correspondant aux filtres.',
  })
  search(@Query() filters: SearchParcoursDto) {
    return this.mobileService.searchParcours(filters);
  }

  @Get(':id/download')
  @ApiOperation({
    summary: 'Télécharger un parcours complet pour le mode hors-ligne (Chantier Critique)',
    description: 'Retourne la structure complète du parcours avec toutes ses étapes, ses jeux et les informations de la commune et de l\'agence. Destiné à être stocké dans la base SQLite locale de l\'application mobile.',
  })
  @ApiResponse({
    status: 200,
    description: 'Le parcours complet avec étapes et jeux.',
  })
  @ApiResponse({
    status: 404,
    description: 'Parcours introuvable ou non publié.',
  })
  download(@Param('id') id: string) {
    return this.mobileService.downloadParcours(id);
  }

  @Get('nearby')
  @ApiOperation({
    summary: 'Trouver des parcours autour d\'une position GPS (Chantier 3.4)',
    description: 'Calcule la distance avec la première étape de chaque parcours publié et retourne ceux dans le rayon spécifié (par défaut 50km), triés du plus proche au plus éloigné.',
  })
  @ApiResponse({
    status: 200,
    description: 'Liste des parcours triés par distance.',
  })
  getNearby(@Query() dto: NearbyParcoursDto) {
    return this.mobileService.getNearbyParcours(dto);
  }
}
