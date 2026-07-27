import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import { CreateAnecdoteDto } from './dto/create-anecdote.dto';
import { PartialType } from '@nestjs/mapped-types';
import * as fs from 'fs';
import { join } from 'path';

export class UpdateAnecdoteDto extends PartialType(CreateAnecdoteDto) {}

@Injectable()
export class AnecdotesService {
  constructor(private readonly db: DatabaseService) {}

  async findAll() {
    return this.db.anecdote.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const anecdote = await this.db.anecdote.findUnique({ where: { id } });
    if (!anecdote) throw new NotFoundException(`Anecdote #${id} introuvable`);
    return anecdote;
  }

  async create(dto: CreateAnecdoteDto) {
    return this.db.anecdote.create({ data: dto });
  }

  async update(id: string, dto: UpdateAnecdoteDto) {
    const existing = await this.findOne(id);
    
    // Nettoyage de l'ancienne image si remplacée
    if (dto.imageUrl !== undefined && existing.imageUrl && dto.imageUrl !== existing.imageUrl) {
      this.cleanupOldImage(existing.imageUrl);
    }

    return this.db.anecdote.update({
      where: { id },
      data: dto,
    });
  }

  async remove(id: string) {
    const existing = await this.findOne(id);
    if (existing.imageUrl) {
      this.cleanupOldImage(existing.imageUrl);
    }
    return this.db.anecdote.delete({ where: { id } });
  }

  private cleanupOldImage(filename: string | null) {
    if (!filename) return;
    try {
      const uploadPath = join(process.cwd(), 'uploads', filename);
      if (fs.existsSync(uploadPath)) {
        fs.unlinkSync(uploadPath);
      }
    } catch (err) {
      console.error('Failed to cleanup anecdote image', err);
    }
  }
}
