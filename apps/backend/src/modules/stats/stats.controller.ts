import { Controller, Get, UseGuards, Res, Request, Query } from '@nestjs/common';
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
  async getStats(
    @Request() req: any,
    @Query('organismeId') organismeId?: string,
    @Query('zonageId') zonageId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.statsService.getDashboardStats(req.user.role, req.user.organismeId ?? null, organismeId, zonageId, startDate, endDate);
  }

  @Get('export/csv')
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Exporter les statistiques des parcours au format CSV (filtres optionnels)' })
  async exportCsv(
    @Res() res: any,
    @Request() req: any,
    @Query('organismeId') organismeId?: string,
    @Query('zonageId') zonageId?: string,
  ) {
    const csv = await this.statsService.exportCsv(req.user.role, req.user.organismeId ?? null, organismeId, zonageId);
    (res as Response).header('Content-Type', 'text/csv');
    (res as Response).attachment('lpo_statistiques_parcours.csv');
    return (res as Response).send(csv);
  }
}
