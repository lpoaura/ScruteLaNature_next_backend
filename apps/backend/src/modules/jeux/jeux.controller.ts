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
  @ApiOperation({ 
    summary: 'Créer un nouveau mini-jeu interactif rattaché à une étape de balade',
    description:
      "Permet de créer un mini-jeu (QCM, Pyramide de calcul, Charade, Code César, EcoGeste, Validation Lieu, etc.) associé à une étape du parcours. " +
      "Les détails spécifiques du jeu (questions, réponses, indices, grille pyramidale) doivent être transmis sous forme d'un objet JSON flexible dans 'donneesJeu'. " +
      "Vous pouvez également paramétrer 'maxAttempts' (nombre d'essais max avant échec, par défaut 2) et 'isBlocking' (si le joueur est obligé de réussir pour progresser)."
  })
  @ApiResponse({ 
    status: 201, 
    description: 'Jeu créé avec succès en base de données.',
    schema: {
      example: {
        id: '9f8e7d6c-5b4a-3f2e-1d0c-9b8a7f6e5d4c',
        etapeId: '1f2e3d4c-5b6a-7f8e-9a0b-1c2d3e4f5a6b',
        type: 'QCM',
        question: 'Quelle est la principale caractéristique de ce héron ?',
        explication: "Le héron cendré se reconnaît à son long cou replié en 'S' pendant le vol et son plumage gris-bleu.",
        maxAttempts: 2,
        isBlocking: false,
        ordre: 1,
        donneesJeu: {
          options: ['Il vole le cou tendu', 'Il vole le cou replié en S', 'Il est exclusivement nocturne'],
          bonneReponse: 1,
          indices: ['Observez attentivement son plumage', "Regardez la posture de son cou lorsqu'il vole dans l'air"]
        },
        createdAt: '2026-08-04T12:00:00.000Z'
      }
    }
  })
  @ApiResponse({ status: 403, description: "Accès interdit : l'étape cible appartient à un autre organisme ou vos privilèges sont insuffisants." })
  @ApiResponse({ status: 404, description: "Étape parente introuvable dans la base de données." })
  create(@Body() createJeuDto: CreateJeuDto, @Request() req: any) {
    return this.jeuxService.create(
      createJeuDto,
      req.user.role,
      req.user.organismeId ?? null,
    );
  }

  @Get('etape/:etapeId')
  @Roles(Role.EDITOR, Role.ADMIN, Role.SUPER_ADMIN)
  @ApiOperation({ 
    summary: 'Lister tous les jeux associés à une étape spécifique',
    description: 'Retourne la collection complète des jeux configurés pour une étape précise de balade, triés dans leur ordre d\'apparition logique pour le joueur mobile.'
  })
  @ApiParam({ name: 'etapeId', description: "UUID de l'étape de balade (ex: 1f2e3d4c-5b6a-7f8e-9a0b-1c2d3e4f5a6b)" })
  @ApiResponse({ 
    status: 200, 
    description: 'Liste chronologique des jeux de l\'étape.',
    schema: {
      example: [
        {
          id: '9f8e7d6c-5b4a-3f2e-1d0c-9b8a7f6e5d4c',
          type: 'QCM',
          question: 'Quelle est la principale caractéristique de ce héron ?',
          ordre: 1,
          maxAttempts: 2,
          isBlocking: false
        }
      ]
    }
  })
  findAllByEtape(@Param('etapeId') etapeId: string, @Request() req: any) {
    return this.jeuxService.findAllByEtape(
      etapeId,
      req.user.role,
      req.user.organismeId ?? null,
    );
  }

  @Get(':id')
  @Roles(Role.EDITOR, Role.ADMIN, Role.SUPER_ADMIN)
  @ApiOperation({ 
    summary: 'Récupérer les détails complets d\'un jeu (y compris les données JSON et solutions)',
    description: 'Permet aux éditeurs et administrateurs d\'afficher la configuration technique complète du mini-jeu (donneesJeu, solutions, indices, paramètres de tentatives).'
  })
  @ApiParam({ name: 'id', description: 'UUID du mini-jeu à consulter' })
  @ApiResponse({ 
    status: 200, 
    description: 'Configuration technique complète du jeu.',
    schema: {
      example: {
        id: '9f8e7d6c-5b4a-3f2e-1d0c-9b8a7f6e5d4c',
        etapeId: '1f2e3d4c-5b6a-7f8e-9a0b-1c2d3e4f5a6b',
        type: 'PYRAMIDE',
        question: 'Complétez la pyramide de calcul pour découvrir la taille de l\'oiseau !',
        maxAttempts: 3,
        isBlocking: false,
        donneesJeu: {
          grille: [['50'], ['30', '20'], ['15', '15', '5']],
          indices: ['Rappelez-vous : chaque case est la somme des deux cases positionnées juste sous elle.']
        }
      }
    }
  })
  @ApiResponse({ status: 404, description: 'Jeu introuvable.' })
  findOne(@Param('id') id: string, @Request() req: any) {
    return this.jeuxService.findOne(
      id,
      req.user.role,
      req.user.organismeId ?? null,
    );
  }

  @Patch(':id')
  @Roles(Role.EDITOR, Role.ADMIN, Role.SUPER_ADMIN)
  @ApiOperation({ 
    summary: 'Mettre à jour la configuration d\'un jeu (type, question, JSON de données, tentatives)',
    description: 'Modifie les propriétés d\'un mini-jeu existant. Le système vérifie automatiquement les permissions selon le rôle et l\'organisme auquel est rattachée l\'étape du jeu.'
  })
  @ApiParam({ name: 'id', description: 'UUID du jeu à modifier' })
  @ApiResponse({ status: 200, description: 'Le mini-jeu a été mis à jour avec succès.' })
  @ApiResponse({ status: 403, description: 'Accès refusé : vous essayez de modifier un jeu en dehors de votre organisme LPO.' })
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
      req.user.organismeId ?? null,
    );
  }

  @Delete(':id')
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @ApiOperation({ 
    summary: 'Supprimer un mini-jeu de balade — ADMIN/SUPER_ADMIN',
    description: 'Supprime définitivement de la base de données un mini-jeu associé à une étape. Opération strictement réservée aux Administrateurs et Super-Administrateurs.'
  })
  @ApiParam({ name: 'id', description: 'UUID du jeu à supprimer' })
  @ApiResponse({ status: 200, description: 'Jeu supprimé avec succès.' })
  @ApiResponse({ status: 403, description: 'Privilèges insuffisants ou jeu appartenant à un organisme externe.' })
  @ApiResponse({ status: 404, description: 'Jeu introuvable.' })
  remove(@Param('id') id: string, @Request() req: any) {
    return this.jeuxService.remove(
      id,
      req.user.role,
      req.user.organismeId ?? null,
    );
  }
}
