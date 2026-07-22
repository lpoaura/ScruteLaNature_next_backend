import { Controller, Get, Post, Body, Query, Param, Request } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
  ApiBody,
  ApiParam,
} from '@nestjs/swagger';
import { MobileService } from './mobile.service';
import { SearchParcoursDto } from './dto/search-parcours.dto';
import { NearbyParcoursDto } from './dto/nearby-parcours.dto';
import { SyncMobileDto } from './dto/sync-mobile.dto';
import { OptionalAuth } from '../../common/decorators/optional-auth.decorator';

@ApiTags('Mobile')
@ApiBearerAuth()
@Controller('mobile')
export class MobileController {
  constructor(private readonly mobileService: MobileService) {}

  // ── Synchronisation Hors-Ligne (Tâche 4.1) ─────────────────────────────────

  @Post('sync')
  @ApiOperation({
    summary: 'Synchroniser les données hors-ligne du mobile (Tâche 4.1)',
    description:
      'Endpoint idempotent. Le mobile envoie une liste de parcours terminés et d\'observations'
      + ' faits sans connexion. Chaque événement possède un syncId unique (UUID généré par le mobile)'
      + ' qui garantit qu\'il ne sera jamais traité deux fois même en cas de coupure réseau.',
  })
  @ApiBody({ type: SyncMobileDto })
  @ApiResponse({ status: 200, description: 'Rapport de synchronisation avec compteurs synced/skipped.' })
  sync(@Body() dto: SyncMobileDto, @Request() req: any) {
    return this.mobileService.syncMobileData(req.user.id, dto);
  }


  @Get('parcours/search')
  @ApiOperation({
    summary:
      'Recherche de parcours publiés par zonage et/ou accessibilité (joueur / invité)',
    description:
      'Route accessible aux joueurs authentifiés (y compris mode Invité). Retourne uniquement les parcours au statut PUBLISHED.',
  })
  @ApiQuery({ name: 'zonageId', required: false, type: String })
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

  @Get('parcours/:id/download')
  @OptionalAuth()
  @ApiOperation({
    summary: 'Télécharger un parcours complet pour le mode hors-ligne (Chantier Critique)',
    description: 'Retourne la structure complète du parcours avec toutes ses étapes, ses jeux et les informations de la zonage et de l\'organisme. Destiné à être stocké dans la base SQLite locale de l\'application mobile.',
  })
  @ApiParam({ name: 'id', description: 'ID du parcours' })
  @ApiResponse({ status: 200, description: 'Le parcours complet.' })
  @ApiResponse({ status: 404, description: 'Parcours introuvable ou non publié.' })
  downloadParcours(@Param('id') id: string, @Request() req: any) {
    return this.mobileService.downloadParcours(id, false, req.user?.id);
  }

  @Get('parcours/:id/preview')
  @ApiOperation({
    summary: 'Prévisualiser un parcours (Mode Test)',
    description: 'Retourne la structure complète du parcours même s\'il n\'est pas publié. Destiné au test depuis le back-office.',
  })
  @ApiParam({ name: 'id', description: 'ID du parcours' })
  @ApiResponse({ status: 200, description: 'Le parcours complet.' })
  @ApiResponse({ status: 404, description: 'Parcours introuvable.' })
  previewParcours(@Param('id') id: string) {
    return this.mobileService.downloadParcours(id, true);
  }

  @Get('badges')
  @ApiOperation({
    summary: 'Récupérer tous les badges existants',
    description: 'Retourne la liste de tous les badges du jeu pour affichage côté mobile.',
  })
  @ApiResponse({ status: 200, description: 'La liste de tous les badges.' })
  getBadges() {
    return this.mobileService.getBadges();
  }

  @Get('parcours/nearby')
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
