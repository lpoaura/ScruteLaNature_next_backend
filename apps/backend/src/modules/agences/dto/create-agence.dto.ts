import { IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateAgenceDto {
  @ApiProperty({
    example: 'LPO Bretagne',
    description: "Nom unique de l'agence régionale LPO",
  })
  @IsString()
  @IsNotEmpty({ message: 'Le nom de l\'agence est obligatoire' })
  @MaxLength(100)
  nom: string;
}
