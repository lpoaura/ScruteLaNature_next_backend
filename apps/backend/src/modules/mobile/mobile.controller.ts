import { Controller, Get, Query } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { MobileService } from './mobile.service';
import { SearchParcoursDto } from './dto/search-parcours.dto';

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
}
