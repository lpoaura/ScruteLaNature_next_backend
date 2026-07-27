import { IsString, IsNotEmpty, IsBoolean, IsOptional, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateAnecdoteDto {
  @ApiProperty({ example: 'Le chardonneret élégant...', description: 'Texte de l\'anecdote' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  content: string;

  @ApiPropertyOptional({ example: 'uuid.png', description: 'Nom du fichier image' })
  @IsOptional()
  @IsString()
  imageUrl?: string;

  @ApiPropertyOptional({ example: true, description: 'Est-elle active pour le mobile ?' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
