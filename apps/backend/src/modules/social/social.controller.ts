import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Body,
  Param,
  Request,
  Query,
} from '@nestjs/common';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '@prisma/client';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiBody,
  ApiQuery,
} from '@nestjs/swagger';
import { SocialService } from './social.service';
import { SendFriendRequestDto } from './dto/send-friend-request.dto';
import { CreateReviewDto } from './dto/create-review.dto';
import { SendParcoursInvitationDto } from './dto/send-parcours-invitation.dto';

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

// ── Invitations de Parcours ──────────────────────────────────────────────────

@ApiTags('Social — Invitations de Parcours')
@ApiBearerAuth()
@Controller('social/invitations')
export class InvitationsController {
  constructor(private readonly socialService: SocialService) {}

  @Post()
  @ApiOperation({ summary: 'Envoyer une invitation pour un parcours à un ami' })
  @ApiResponse({ status: 201, description: 'Invitation envoyée.' })
  sendInvitation(@Body() dto: SendParcoursInvitationDto, @Request() req: any) {
    return this.socialService.sendParcoursInvitation(req.user.id, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Lister les invitations de parcours reçues' })
  @ApiResponse({ status: 200, description: 'Liste des invitations.' })
  getInvitations(@Request() req: any) {
    return this.socialService.getReceivedInvitations(req.user.id);
  }

  @Patch(':id/accept')
  @ApiOperation({ summary: 'Accepter une invitation de parcours' })
  @ApiResponse({ status: 200, description: 'Invitation acceptée.' })
  acceptInvitation(@Param('id') id: string, @Request() req: any) {
    return this.socialService.respondToInvitation(id, req.user.id, true);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Refuser une invitation de parcours' })
  @ApiResponse({ status: 200, description: 'Invitation refusée.' })
  declineInvitation(@Param('id') id: string, @Request() req: any) {
    return this.socialService.respondToInvitation(id, req.user.id, false);
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

  @Get('admin/all')
  @Roles(Role.EDITOR, Role.ADMIN, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Lister tous les avis pour la modération (EDITOR/ADMIN/SUPER_ADMIN)' })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page courante (défaut: 1)' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Nombre d\'éléments par page (défaut: 20)' })
  @ApiQuery({ name: 'rating', required: false, type: Number, description: 'Filtre par note' })
  @ApiQuery({ name: 'sortOrder', required: false, type: String, description: 'Ordre de tri (asc ou desc)' })
  @ApiResponse({ status: 200, description: 'Liste complète des avis avec auteur et parcours paginée.' })
  getAllReviews(
    @Request() req: any,
    @Query('page') page = '1',
    @Query('limit') limit = '20',
    @Query('rating') rating?: string,
    @Query('sortOrder') sortOrder: 'asc' | 'desc' = 'desc'
  ) {
    return this.socialService.getAllReviews(req.user.role, req.user.organismeId ?? null, +page, +limit, rating ? +rating : undefined, sortOrder);
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
