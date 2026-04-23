import {
  IsString,
  IsNotEmpty,
  IsEnum,
  IsNumber,
  IsInt,
  IsBoolean,
  IsOptional,
  IsUUID,
  Min,
  Max,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Difficulty, PublishStatus } from '@prisma/client';

export class CreateParcoursDto {
  @ApiProperty({ example: 'La Forêt des Oiseaux', description: 'Titre du parcours' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  title: string;

  @ApiProperty({
    example: 'Partez à la découverte des espèces locales à travers ce sentier boisé.',
    description: 'Description complète du parcours',
  })
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiProperty({ enum: Difficulty, example: 'FACILE', description: 'Niveau de difficulté' })
  @IsEnum(Difficulty)
  difficulty: Difficulty;

  @ApiProperty({ example: 3.5, description: 'Distance en kilomètres' })
  @IsNumber()
  @Min(0.1)
  @Max(100)
  distanceKm: number;

  @ApiProperty({ example: 90, description: 'Durée estimée en minutes' })
  @IsInt()
  @Min(5)
  durationMin: number;

  @ApiProperty({
    example: 'uuid-generated.jpg',
    description: "Nom du fichier image de couverture (retourné par POST /medias/upload)",
  })
  @IsString()
  @IsNotEmpty()
  coverImage: string;

  @ApiPropertyOptional({
    enum: PublishStatus,
    example: 'DRAFT',
    description: 'Statut de publication',
  })
  @IsOptional()
  @IsEnum(PublishStatus)
  status?: PublishStatus;

  @ApiPropertyOptional({ example: '{"type":"LineString",...}', description: 'Tracé GPX en GeoJSON' })
  @IsOptional()
  @IsString()
  pathGeoJSON?: string;

  @ApiPropertyOptional({ example: 'Hibou', description: "Nom de la mascotte du parcours" })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  mascotteNom?: string;

  @ApiPropertyOptional({ example: 'uuid-hibou.png', description: "Image de la mascotte" })
  @IsOptional()
  @IsString()
  mascotteImg?: string;

  @ApiProperty({ example: 'uuid-commune-1234', description: 'UUID de la commune rattachée' })
  @IsUUID()
  @IsNotEmpty()
  communeId: string;

  @ApiPropertyOptional({ example: false, description: 'Accessible aux personnes à mobilité réduite' })
  @IsOptional()
  @IsBoolean()
  isPMRFriendly?: boolean;

  @ApiPropertyOptional({ example: true, description: 'Adapté aux enfants' })
  @IsOptional()
  @IsBoolean()
  isChildFriendly?: boolean;

  @ApiPropertyOptional({ example: false, description: 'Adapté aux personnes avec handicap mental' })
  @IsOptional()
  @IsBoolean()
  isMentalHandicapFriendly?: boolean;
}
