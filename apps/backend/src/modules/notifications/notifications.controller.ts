import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiProperty } from '@nestjs/swagger';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { IsString, IsNotEmpty } from 'class-validator';

export class SendPushDto {
  @ApiProperty({ example: 'Mise à jour LPO !' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({ example: "Découvrez la nouvelle version de l'application." })
  @IsString()
  @IsNotEmpty()
  body: string;
}

@ApiTags('Admin Notifications')
@ApiBearerAuth()
@Controller('admin/notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Post('send-all')
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @ApiOperation({
    summary: 'Envoyer une notification push à tous les utilisateurs (avec rapport de diagnostic)',
    description: "Envoie un message via l'API Expo et retourne un diagnostic précis du nombre d'appareils cibles, du nombre d'envois réussis et du détail des erreurs ou refus éventuels.",
  })
  async sendToAll(@Body() dto: SendPushDto) {
    const report = await this.notificationsService.sendToAll(dto.title, dto.body, { source: 'backoffice' });
    return {
      message: report.success
        ? `Notifications envoyées avec succès (${report.sentCount} appareil[s] notifié[s]).`
        : `L'envoi des notifications a échoué ou a renvoyé un avertissement (${report.sentCount} succès, ${report.errorCount} erreur[s]).`,
      report,
    };
  }
}
