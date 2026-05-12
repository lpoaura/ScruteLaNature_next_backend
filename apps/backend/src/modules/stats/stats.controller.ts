import { Controller, Get, UseGuards, Res, Request } from '@nestjs/common';
import { StatsService } from './stats.service';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '@prisma/client';
import type { Response } from 'express';

@ApiTags('Statistiques & Exports (Admin)')
@ApiBearerAuth()
@Controller('admin/stats')
export class StatsController {
  constructor(private readonly statsService: StatsService) {}

  @Get()
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Récupérer les statistiques globales et le tableau croisé' })
  @ApiResponse({ status: 200, description: 'Statistiques récupérées avec succès.' })
  async getStats(@Request() req: any) {
    return this.statsService.getDashboardStats(req.user.role, req.user.organismeId ?? null);
  }

  @Get('export/csv')
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Exporter les statistiques des parcours au format CSV' })
  async exportCsv(@Res() res: any, @Request() req: any) {
    const csv = await this.statsService.exportCsv(req.user.role, req.user.organismeId ?? null);
    (res as Response).header('Content-Type', 'text/csv');
    (res as Response).attachment('lpo_statistiques_parcours.csv');
    return (res as Response).send(csv);
  }
}
