import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsNumber, IsOptional, Max, Min } from 'class-validator';

export class NearbyParcoursDto {
  @ApiProperty({ description: 'Latitude de l\'utilisateur' })
  @Type(() => Number)
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude: number;

  @ApiProperty({ description: 'Longitude de l\'utilisateur' })
  @Type(() => Number)
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude: number;

  @ApiPropertyOptional({ description: 'Rayon de recherche en kilomètres (défaut: 50)' })
  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  radiusKm?: number;
}
