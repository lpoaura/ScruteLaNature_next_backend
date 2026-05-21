import { Controller, Post, Param, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { DownloadsService } from './downloads.service';
import { OptionalAuth } from '../../common/decorators/optional-auth.decorator';

@ApiTags('Téléchargements (Mobile)')
@ApiBearerAuth()
@Controller('parcours')
export class DownloadsController {
  constructor(private readonly downloadsService: DownloadsService) {}

  @Post(':id/download')
  @OptionalAuth()
  @ApiOperation({
    summary: 'Enregistrer un téléchargement de parcours (appelé par l\'app mobile)',
    description:
      'Peut être appelé avec ou sans token JWT. ' +
      'Si authentifié, l\'userId est enregistré. Sinon, le téléchargement est tracé de façon anonyme.',
  })
  @ApiParam({ name: 'id', description: 'UUID du parcours téléchargé' })
  @ApiResponse({ status: 201, description: 'Téléchargement enregistré.' })
  async recordDownload(@Param('id') parcoursId: string, @Request() req: any) {
    const userId = req?.user?.sub ?? req?.user?.id ?? null;
    return this.downloadsService.recordDownload(parcoursId, userId);
  }
}
