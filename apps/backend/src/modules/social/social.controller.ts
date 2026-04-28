import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Body,
  Param,
  Request,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiBody,
} from '@nestjs/swagger';
import { SocialService } from './social.service';
import { SendFriendRequestDto } from './dto/send-friend-request.dto';
import { CreateReviewDto } from './dto/create-review.dto';

@ApiTags('Social — Amis')
@ApiBearerAuth()
@Controller('social/friends')
export class SocialController {
  constructor(private readonly socialService: SocialService) {}

  @Post('request')
  @ApiOperation({
    summary: 'Envoyer une demande d\'ami (par pseudo)',
    description: 'Le pseudo est l\'identifiant public du joueur. L\'email n\'est jamais exposé.',
  })
  @ApiResponse({ status: 201, description: 'Demande envoyée.' })
  @ApiResponse({ status: 404, description: 'Pseudo introuvable.' })
  @ApiResponse({ status: 409, description: 'Relation déjà existante.' })
  sendRequest(@Body() dto: SendFriendRequestDto, @Request() req: any) {
    return this.socialService.sendFriendRequest(req.user.id, dto);
  }

  @Get('requests')
  @ApiOperation({ summary: 'Voir les demandes d\'ami reçues (statut PENDING)' })
  @ApiResponse({ status: 200, description: 'Liste des demandes en attente.' })
  getPendingRequests(@Request() req: any) {
    return this.socialService.getPendingRequests(req.user.id);
  }

  @Get()
  @ApiOperation({ summary: 'Voir la liste de ses amis (statut ACCEPTED)' })
  @ApiResponse({ status: 200, description: 'Liste des amis.' })
  getFriends(@Request() req: any) {
    return this.socialService.getFriends(req.user.id);
  }

  @Patch(':id/accept')
  @ApiOperation({ summary: 'Accepter une demande d\'ami reçue' })
  @ApiParam({ name: 'id', description: 'ID de la relation Friendship' })
  @ApiResponse({ status: 200, description: 'Demande acceptée, vous êtes maintenant amis.' })
  @ApiResponse({ status: 403, description: 'Seul le destinataire peut accepter.' })
  acceptRequest(@Param('id') id: string, @Request() req: any) {
    return this.socialService.acceptFriendRequest(id, req.user.id);
  }

  @Patch(':id/block')
  @ApiOperation({ summary: 'Bloquer un utilisateur' })
  @ApiParam({ name: 'id', description: 'ID de la relation Friendship' })
  @ApiResponse({ status: 200, description: 'Utilisateur bloqué.' })
  blockUser(@Param('id') id: string, @Request() req: any) {
    return this.socialService.blockUser(id, req.user.id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Supprimer un ami ou refuser / annuler une demande' })
  @ApiParam({ name: 'id', description: 'ID de la relation Friendship' })
  @ApiResponse({ status: 200, description: 'Relation supprimée.' })
  remove(@Param('id') id: string, @Request() req: any) {
    return this.socialService.removeFriendship(id, req.user.id);
  }
}

// ── Avis & Notes ─────────────────────────────────────────────────────────────

@ApiTags('Social — Avis')
@ApiBearerAuth()
@Controller('social/reviews')
export class ReviewsController {
  constructor(private readonly socialService: SocialService) {}

  @Post()
  @ApiOperation({
    summary: 'Laisser un avis sur un parcours (1 seul avis par parcours)',
    description: 'Le joueur doit être connecté. Un seul avis par parcours par utilisateur.',
  })
  @ApiBody({ type: CreateReviewDto })
  @ApiResponse({ status: 201, description: 'Avis enregistré.' })
  @ApiResponse({ status: 409, description: 'Avis déjà existant pour ce parcours.' })
  createReview(@Body() dto: CreateReviewDto, @Request() req: any) {
    return this.socialService.createReview(req.user.id, dto);
  }

  @Get('parcours/:parcoursId')
  @ApiOperation({
    summary: 'Lister les avis d\'un parcours avec note moyenne',
  })
  @ApiParam({ name: 'parcoursId', description: 'ID du parcours' })
  @ApiResponse({ status: 200, description: 'Liste des avis + note moyenne.' })
  getReviews(@Param('parcoursId') parcoursId: string) {
    return this.socialService.getReviewsByParcours(parcoursId);
  }

  @Delete(':id')
  @ApiOperation({
    summary: 'Supprimer un avis (auteur ou modérateur ADMIN/SUPER_ADMIN)',
  })
  @ApiParam({ name: 'id', description: 'ID de l\'avis' })
  @ApiResponse({ status: 200, description: 'Avis supprimé.' })
  @ApiResponse({ status: 403, description: 'Vous ne pouvez supprimer que vos propres avis.' })
  deleteReview(@Param('id') id: string, @Request() req: any) {
    return this.socialService.deleteReview(id, req.user.id, req.user.role);
  }
}
