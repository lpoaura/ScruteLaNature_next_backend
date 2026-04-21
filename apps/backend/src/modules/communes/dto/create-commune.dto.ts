import { IsNotEmpty, IsOptional, IsString, MaxLength, Matches } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateCommuneDto {
  @ApiProperty({
    example: 'Rennes',
    description: 'Nom officiel de la commune',
  })
  @IsString()
  @IsNotEmpty({ message: 'Le nom de la commune est obligatoire' })
  @MaxLength(150)
  nom: string;

  @ApiPropertyOptional({
    example: '35000',
    description: 'Code postal de la commune',
  })
  @IsOptional()
  @IsString()
  @Matches(/^\d{5}$/, { message: 'Le code postal doit être composé de 5 chiffres' })
  codePostal?: string;
}
