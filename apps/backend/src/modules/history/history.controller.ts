import { Controller, Post, Get, Body, Req, UseGuards } from '@nestjs/common';
import { HistoryService } from './history.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RecordHistoryDto } from './dto/record-history.dto';

@Controller('users/me/history')
@UseGuards(JwtAuthGuard)
export class HistoryController {
  constructor(private readonly historyService: HistoryService) {}

  @Get()
  async getHistory(@Req() req) {
    return this.historyService.getUserHistory(req.user.userId);
  }

  @Post()
  async recordHistory(@Req() req, @Body() dto: RecordHistoryDto) {
    return this.historyService.recordHistory(req.user.userId, dto);
  }
}
