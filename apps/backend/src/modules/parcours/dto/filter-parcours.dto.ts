import { IsEnum, IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { PublishStatus, Difficulty } from '@prisma/client';

export class FilterParcoursDto {
  @ApiPropertyOptional({ enum: PublishStatus, description: 'Filtrer par statut' })
  @IsOptional()
  @IsEnum(PublishStatus)
  status?: PublishStatus;

  @ApiPropertyOptional({ enum: Difficulty, description: 'Filtrer par difficulté' })
  @IsOptional()
  @IsEnum(Difficulty)
  difficulty?: Difficulty;

  @ApiPropertyOptional({ description: 'Filtrer par communeId' })
  @IsOptional()
  @IsString()
  communeId?: string;
}
