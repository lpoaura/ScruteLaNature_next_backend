import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsUUID,
  IsInt,
  IsNumber,
  Min,
  Max,
  IsOptional,
} from 'class-validator';

export class CreateEtapeDto {
  @ApiProperty({ description: 'ID du parcours auquel appartient cette étape' })
  @IsUUID()
  @IsNotEmpty()
  parcoursId: string;

  @ApiProperty({ description: "Ordre de l'étape dans le parcours", example: 1 })
  @IsInt()
  @Min(1)
  order: number;

  @ApiProperty({ description: "Titre de l'étape", example: 'La cascade' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({ description: 'Latitude GPS', example: 45.764043 })
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude: number;

  @ApiProperty({ description: 'Longitude GPS', example: 4.835659 })
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude: number;

  @ApiPropertyOptional({ description: "Description détaillée de l'étape" })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ description: 'Texte affiché pendant la transition vers la prochaine étape' })
  @IsString()
  @IsOptional()
  transitionText?: string;
}
