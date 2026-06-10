import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsUUID,
  IsInt,
  Min,
  IsOptional,
  IsEnum,
  IsObject,
} from 'class-validator';
import { JeuType } from '@prisma/client';

export class CreateJeuDto {
  @ApiProperty({ description: 'ID de l\'étape associée au jeu' })
  @IsUUID()
  @IsNotEmpty()
  etapeId: string;

  @ApiProperty({ description: 'Ordre du jeu dans l\'étape', example: 1 })
  @IsInt()
  @Min(1)
  order: number;

  @ApiProperty({ description: 'Type du jeu', enum: JeuType })
  @IsEnum(JeuType)
  @IsNotEmpty()
  type: JeuType;

  @ApiProperty({ description: 'La question ou consigne du jeu' })
  @IsString()
  @IsNotEmpty()
  question: string;

  @ApiPropertyOptional({ description: 'Explication affichée après la réponse' })
  @IsString()
  @IsOptional()
  explication?: string;

  @ApiPropertyOptional({ description: 'URL de l\'audio (consigne vocale par exemple)' })
  @IsString()
  @IsOptional()
  audioUrl?: string;

  @ApiPropertyOptional({ description: 'URL de l\'image d\'illustration' })
  @IsString()
  @IsOptional()
  imageUrl?: string;

  @ApiPropertyOptional({ description: 'Données spécifiques au type de jeu (JSON)' })
  @IsObject()
  @IsOptional()
  donneesJeu?: Record<string, any>;

  @ApiPropertyOptional({ description: 'La bonne réponse (si textuelle)' })
  @IsString()
  @IsOptional()
  reponse?: string;
}
