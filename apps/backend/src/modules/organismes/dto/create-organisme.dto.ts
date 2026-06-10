import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateOrganismeDto {
  @ApiProperty({
    example: 'LPO Rhône',
    description: "Nom unique de l'organisme régional LPO",
  })
  @IsString()
  @IsNotEmpty({ message: 'Le nom de l\'organisme est obligatoire' })
  nom: string;
}
