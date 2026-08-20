import { Controller, Post, Get, Patch, Body, Param } from '@nestjs/common';
import { SignalementsService } from './signalements.service';
import { CreateSignalementDto, UpdateSignalementStatusDto } from './signalement.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { Public } from '../../common/decorators/public.decorator';

@Controller('signalements')
export class SignalementsController {
  constructor(private readonly signalementsService: SignalementsService) {}

  @Public()
  @Post()
  async createSignalement(
    @CurrentUser() user: any,
    @Body() dto: CreateSignalementDto,
  ) {
    return this.signalementsService.createSignalement(user?.id, dto);
  }

  @Roles(Role.ADMIN, Role.SUPER_ADMIN, Role.EDITOR)
  @Get('admin')
  async getAllSignalements() {
    return this.signalementsService.getAllSignalements();
  }

  @Roles(Role.ADMIN, Role.SUPER_ADMIN, Role.EDITOR)
  @Patch('admin/:id/status')
  async updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateSignalementStatusDto,
  ) {
    return this.signalementsService.updateStatus(id, dto);
  }
}
