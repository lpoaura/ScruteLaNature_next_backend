import { IsString, MinLength, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ChangePasswordDto {
  @ApiProperty({ example: 'AncienMotDePasse1!', description: 'Mot de passe actuel' })
  @IsString()
  currentPassword: string;

  @ApiProperty({ example: 'NouveauMotDePasse1!', description: 'Nouveau mot de passe (min 8 car., 1 maj., 1 chiffre, 1 spécial)' })
  @IsString()
  @MinLength(8, { message: 'Le mot de passe doit contenir au moins 8 caractères.' })
  @Matches(/^(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).+$/, {
    message: 'Le mot de passe doit contenir au moins une majuscule, un chiffre et un caractère spécial.',
  })
  newPassword: string;
}
