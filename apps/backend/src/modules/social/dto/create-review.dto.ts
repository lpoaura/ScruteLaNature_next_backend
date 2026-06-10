import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsUUID, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

export class CreateReviewDto {
  @ApiProperty({ description: 'ID du parcours noté' })
  @IsUUID()
  parcoursId: string;

  @ApiProperty({ description: 'Note entre 1 et 5 étoiles', minimum: 1, maximum: 5 })
  @IsInt()
  @Min(1)
  @Max(5)
  rating: number;

  @ApiPropertyOptional({ description: 'Commentaire optionnel (max 1000 caractères)' })
  @IsString()
  @IsOptional()
  @MaxLength(1000)
  comment?: string;
}
