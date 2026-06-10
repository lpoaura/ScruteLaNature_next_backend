import { IsEnum, IsOptional, IsString, IsInt, Min } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { PublishStatus, Difficulty } from '@prisma/client';
import { Type } from 'class-transformer';

export class FilterParcoursDto {
  @ApiPropertyOptional({ enum: PublishStatus, description: 'Filtrer par statut' })
  @IsOptional()
  @IsEnum(PublishStatus)
  status?: PublishStatus;

  @ApiPropertyOptional({ enum: Difficulty, description: 'Filtrer par difficulté' })
  @IsOptional()
  @IsEnum(Difficulty)
  difficulty?: Difficulty;

  @ApiPropertyOptional({ description: 'Filtrer par zonageId' })
  @IsOptional()
  @IsString()
  zonageId?: string;

  @ApiPropertyOptional({ description: 'Filtrer par organismeId (SUPER_ADMIN uniquement)' })
  @IsOptional()
  @IsString()
  organismeId?: string;

  @ApiPropertyOptional({ description: 'Page (défaut: 1)', default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ description: 'Items par page (défaut: 15)', default: 15 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 15;
}
