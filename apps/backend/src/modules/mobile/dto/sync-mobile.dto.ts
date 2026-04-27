import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsNumber, IsOptional, IsString, IsUUID, ValidateNested } from 'class-validator';

export class ParcoursCompletedEventDto {
  @ApiProperty({ description: 'ID unique généré par le mobile pour éviter les doublons' })
  @IsUUID()
  syncId: string;

  @ApiProperty({ description: 'ID du parcours terminé' })
  @IsUUID()
  parcoursId: string;

  @ApiProperty({ description: 'Score obtenu' })
  @IsNumber()
  score: number;

  @ApiProperty({ description: 'Date de complétion en ISO string' })
  @IsString()
  completedAt: string;

  @ApiPropertyOptional({ description: 'Estimation du CO2 économisé' })
  @IsNumber()
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

  @ApiPropertyOptional({ description: 'Confiance de l\'IA' })
  @IsNumber()
  @IsOptional()
  aiConfidence?: number;

  @ApiProperty({ description: 'Date de l\'observation' })
  @IsString()
  timestamp: string;
}

export class SyncMobileDto {
  @ApiPropertyOptional({ type: [ParcoursCompletedEventDto], description: 'Parcours terminés hors-ligne' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ParcoursCompletedEventDto)
  @IsOptional()
  parcoursCompleted?: ParcoursCompletedEventDto[];

  @ApiPropertyOptional({ type: [ObservationEventDto], description: 'Observations faites hors-ligne' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ObservationEventDto)
  @IsOptional()
  observations?: ObservationEventDto[];
}
