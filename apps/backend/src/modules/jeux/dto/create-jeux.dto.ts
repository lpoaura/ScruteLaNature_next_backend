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
  IsBoolean,
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

  @ApiPropertyOptional({ description: 'La question ou consigne du jeu' })
  @IsString()
  @IsOptional()
  question?: string;

  @ApiPropertyOptional({ description: 'Le titre personnalisé du jeu' })
  @IsString()
  @IsOptional()
  titre?: string;

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

  @ApiPropertyOptional({ description: 'Nombre maximum de tentatives' })
  @IsInt()
  @IsOptional()
  maxAttempts?: number;

  @ApiPropertyOptional({ description: 'Message affiché en cas déchec total' })
  @IsString()
  @IsOptional()
  messageEchec?: string;

  @ApiPropertyOptional({ description: 'Le jeu bloque-t-il la progression sil nest pas réussi ?' })
  @IsBoolean()
  @IsOptional()
  isBlocking?: boolean;
}
