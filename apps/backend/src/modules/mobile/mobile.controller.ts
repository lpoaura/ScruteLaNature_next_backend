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
  @OptionalAuth()
  @ApiOperation({
    summary: 'Rechercher et filtrer les parcours publiés (Chantier 3.3)',
    description: 'Permet la recherche par texte (titre, description) et le filtrage multi-critères.',
  })
  @ApiQuery({ name: 'q', required: false })
  @ApiQuery({ name: 'difficulty', required: false, enum: ['FACILE', 'MOYEN', 'DIFFICILE'] })
  @ApiQuery({ name: 'maxDuration', required: false, type: Number })
  @ApiQuery({ name: 'maxDistance', required: false, type: Number })
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
  @OptionalAuth()
  @ApiOperation({
    summary: 'Prévisualiser un parcours (Admin uniquement)',
    description: 'Identique au téléchargement, mais autorise l\'accès aux parcours non publiés pour les tests internes (Back-office).',
  })
  @ApiParam({ name: 'id', description: 'ID du parcours' })
  @ApiResponse({ status: 200, description: 'Le parcours complet.' })
  @ApiResponse({ status: 403, description: 'Accès refusé.' })
  @ApiResponse({ status: 404, description: 'Parcours introuvable.' })
  previewParcours(@Param('id') id: string, @Request() req: any) {
    return this.mobileService.downloadParcours(id, true, req.user?.id);
  }

  @Get('badges')
  @OptionalAuth()
  @ApiOperation({
    summary: 'Récupérer la liste de tous les badges disponibles',
  })
  @ApiResponse({ status: 200, description: 'Liste des badges.' })
  getBadges() {
    return this.mobileService.getBadges();
  }

  @Get('parcours/nearby')
  @OptionalAuth()
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

  @Get('anecdotes')
  @OptionalAuth()
  @ApiOperation({
    summary: 'Récupérer les anecdotes actives (Le saviez-vous ?)',
  })
  @ApiResponse({ status: 200, description: 'Liste des anecdotes.' })
  getAnecdotes() {
    return this.mobileService.getActiveAnecdotes();
  }

  @Get('community/feed')
  @OptionalAuth()
  @ApiOperation({
    summary: 'Récupérer le flux d\'actualité de la communauté',
    description: 'Retourne les 10 derniers avis laissés sur les parcours',
  })
  @ApiResponse({ status: 200, description: 'Liste des derniers avis.' })
  getCommunityFeed() {
    return this.mobileService.getCommunityFeed();
  }
}
