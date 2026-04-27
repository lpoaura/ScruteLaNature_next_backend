import { IsNotEmpty, IsOptional, IsString, MaxLength, Matches } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateZonageDto {
  @ApiProperty({
    example: 'Rennes',
    description: 'Nom officiel de la zonage',
  })
  @IsString()
  @IsNotEmpty({ message: 'Le nom de la zonage est obligatoire' })
  @MaxLength(150)
  nom: string;

  @ApiPropertyOptional({
    example: '35000',
    description: 'Code postal de la zonage',
  })
  @IsOptional()
  @IsString()
  @Matches(/^\d{5}$/, { message: 'Le code postal doit être composé de 5 chiffres' })
  codePostal?: string;
}
