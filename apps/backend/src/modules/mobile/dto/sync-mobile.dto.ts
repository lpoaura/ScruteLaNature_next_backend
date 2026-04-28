import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsISO8601,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
  ArrayMaxSize,
  ValidateNested,
} from 'class-validator';

export class ParcoursCompletedEventDto {
  @ApiProperty({ description: 'ID unique généré par le mobile pour éviter les doublons' })
  @IsUUID()
  syncId: string;

  @ApiProperty({ description: 'ID du parcours terminé' })
  @IsUUID()
  parcoursId: string;

  @ApiProperty({ description: 'Score obtenu (entier positif)' })
  @IsInt()
  @Min(0)
  score: number;

  @ApiProperty({ description: 'Date de complétion en ISO 8601 (ex: 2026-04-27T14:00:00.000Z)' })
  @IsISO8601()
  completedAt: string;

  @ApiPropertyOptional({ description: 'Estimation du CO2 économisé (kg, positif)' })
  @IsNumber()
  @Min(0)
  @IsOptional()
  co2Saved?: number;
}

export class ObservationEventDto {
  @ApiProperty({ description: 'ID unique généré par le mobile pour éviter les doublons' })
  @IsUUID()
  syncId: string;

  @ApiPropertyOptional({ description: 'Nom de l\'espèce' })
  @IsString()
  @IsOptional()
  speciesName?: string;

  @ApiProperty({ description: 'Nom du fichier image déjà uploadé (retourné par POST /medias/upload)' })
  @IsString()
  imageUrl: string;

  @ApiProperty({ description: 'Latitude' })
  @IsNumber()
  latitude: number;

  @ApiProperty({ description: 'Longitude' })
  @IsNumber()
  longitude: number;

  @ApiPropertyOptional({ description: 'Confiance de l\'IA (entre 0 et 1)' })
  @IsNumber()
  @Min(0)
  @Max(1)
  @IsOptional()
  aiConfidence?: number;

  @ApiProperty({ description: 'Date de l\'observation en ISO 8601 (ex: 2026-04-27T14:00:00.000Z)' })
  @IsISO8601()
  timestamp: string;
}

export class SyncMobileDto {
  @ApiPropertyOptional({ type: [ParcoursCompletedEventDto], description: 'Parcours terminés hors-ligne (max 100 par requête)' })
  @IsArray()
  @ArrayMaxSize(100, { message: 'Maximum 100 événements de parcours par synchronisation' })
  @ValidateNested({ each: true })
  @Type(() => ParcoursCompletedEventDto)
  @IsOptional()
  parcoursCompleted?: ParcoursCompletedEventDto[];

  @ApiPropertyOptional({ type: [ObservationEventDto], description: 'Observations faites hors-ligne (max 200 par requête)' })
  @IsArray()
  @ArrayMaxSize(200, { message: 'Maximum 200 observations par synchronisation' })
  @ValidateNested({ each: true })
  @Type(() => ObservationEventDto)
  @IsOptional()
  observations?: ObservationEventDto[];
}
