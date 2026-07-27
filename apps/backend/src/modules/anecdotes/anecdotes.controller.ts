import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { AnecdotesService, UpdateAnecdoteDto } from './anecdotes.service';
import { CreateAnecdoteDto } from './dto/create-anecdote.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '@prisma/client';

@ApiTags('Anecdotes (Admin)')
@ApiBearerAuth()
@Controller('admin/anecdotes')
export class AnecdotesController {
  constructor(private readonly anecdotesService: AnecdotesService) {}

  @Get()
  @Roles(Role.EDITOR, Role.ADMIN, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Lister toutes les anecdotes' })
  findAll() {
    return this.anecdotesService.findAll();
  }

  @Get(':id')
  @Roles(Role.EDITOR, Role.ADMIN, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Détail d\'une anecdote' })
  findOne(@Param('id') id: string) {
    return this.anecdotesService.findOne(id);
  }

  @Post()
  @Roles(Role.EDITOR, Role.ADMIN, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Créer une anecdote' })
  create(@Body() dto: CreateAnecdoteDto) {
    return this.anecdotesService.create(dto);
  }

  @Patch(':id')
  @Roles(Role.EDITOR, Role.ADMIN, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Mettre à jour une anecdote' })
  update(@Param('id') id: string, @Body() dto: UpdateAnecdoteDto) {
    return this.anecdotesService.update(id, dto);
  }

  @Delete(':id')
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Supprimer une anecdote' })
  remove(@Param('id') id: string) {
    return this.anecdotesService.remove(id);
  }
}
