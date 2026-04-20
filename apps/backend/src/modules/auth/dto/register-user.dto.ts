import {
  IsEmail,
  IsNotEmpty,
  IsBoolean,
  IsString,
  MinLength,
  MaxLength,
  Matches,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RegisterUserDto {
  @ApiProperty({
    example: 'joueur@lpo.fr',
    description: "L'adresse email du joueur",
  })
  @IsEmail({}, { message: "L'adresse email doit être valide" })
  @IsNotEmpty({ message: "L'email est obligatoire" })
  email: string;

  @ApiProperty({
    example: 'Explorateur73',
    description: "Le pseudo du joueur en jeu",
  })
  @IsString({ message: 'Le pseudo doit être une chaîne de caractères' })
  @IsNotEmpty({ message: 'Le pseudo est obligatoire' })
  @MinLength(3, { message: 'Le pseudo doit comporter au moins 3 caractères' })
  pseudo: string;

  @ApiProperty({
    example: 'StrongP@ssw0rd!',
    description: 'Mot de passe sécurisé',
  })
  @IsString({ message: 'Le mot de passe doit être une chaîne de caractères' })
  @IsNotEmpty({ message: 'Le mot de passe est obligatoire' })
  @MinLength(8, {
    message: 'Le mot de passe doit contenir au moins 8 caractères',
  })
  @MaxLength(32, {
    message: 'Le mot de passe ne peut pas dépasser 32 caractères',
  })
  @Matches(/(?=.*\d)/, {
    message: 'Le mot de passe doit contenir au moins un chiffre',
  })
  password: string;

  @ApiProperty({
    example: true,
    description: 'Vaut true si le joueur a accepté les RGPD',
  })
  @IsBoolean()
  @IsNotEmpty()
  rgpdAccepted: boolean;
}
