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
    example: '07',
    description: 'Code du zonage (ex: code département)',
  })
  @IsOptional()
  @IsString()
  @MaxLength(10)
  code?: string;
}
