import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsISO8601,
  IsInt,
  IsNumber,
  IsOptional,
  IsUUID,
  Min,
  ArrayMaxSize,
  ValidateNested,
} from 'class-validator';

export class ParcoursCompletedEventDto {
  @ApiProperty({ description: 'ID unique généré par le mobile pour éviter les doublons (UUID v4)' })
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

export class SyncMobileDto {
  @ApiPropertyOptional({
    type: [ParcoursCompletedEventDto],
    description: 'Parcours terminés hors-ligne (max 100 par requête)',
  })
  @IsArray()
  @ArrayMaxSize(100, { message: 'Maximum 100 événements de parcours par synchronisation' })
  @ValidateNested({ each: true })
  @Type(() => ParcoursCompletedEventDto)
  @IsOptional()
  parcoursCompleted?: ParcoursCompletedEventDto[];
}

// NOTE : La synchronisation des observations (photos terrain) est volontairement
// non implémentée en attente de confirmation du budget de stockage.
// Le modèle Prisma `Observation` est conservé en base de données.
// Pour réactiver : ajouter ObservationEventDto + le champ observations[] dans ce DTO,
// et décommenter le bloc correspondant dans MobileService.syncMobileData().
