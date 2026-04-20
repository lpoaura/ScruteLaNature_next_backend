import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
  MaxLength,
  Matches,
  IsEnum,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Role } from '@prisma/client';

export class CreateUserDto {
  @ApiProperty({
    example: 'john.doe@example.com',
    description: "L'adresse email de l'utilisateur",
  })
  @IsEmail({}, { message: "L'adresse email doit être valide" })
  @IsNotEmpty({ message: "L'email est obligatoire" })
  email: string;

  @ApiProperty({
    example: 'StrongP@ssw0rd!',
    description:
      'Mot de passe avec au moins une majuscule, minuscule, chiffre et caractère spécial (8-32 caractères)',
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
  @Matches(/(?=.*[a-z])/, {
    message: 'Le mot de passe doit contenir au moins une lettre minuscule',
  })
  @Matches(/(?=.*[A-Z])/, {
    message: 'Le mot de passe doit contenir au moins une lettre majuscule',
  })
  @Matches(/(?=.*[!@#$%^&*])/, {
    message: 'Le mot de passe doit contenir au moins un caractère spécial',
  })
  password: string;

  @ApiPropertyOptional({
    example: 'John',
    description: "Le prénom de l'utilisateur",
  })
  @IsOptional()
  @IsString({ message: 'Le prénom doit être une chaîne de caractères' })
  firstName?: string;

  @ApiPropertyOptional({
    example: 'Doe',
    description: "Le nom de famille de l'utilisateur",
  })
  @IsOptional({ message: 'Le nom de famille est optionnel' })
  @IsString({ message: 'Le nom de famille doit être une chaîne de caractères' })
  lastName?: string;

  @ApiProperty({
    example: 'EDITOR',
    description: 'Le rôle LPO (ADMIN, EDITOR, SUPER_ADMIN)',
    enum: Role,
  })
  @IsEnum(Role, { message: 'Le rôle doit être valide (ADMIN, EDITOR...)' })
  @IsNotEmpty()
  role: Role;

  @ApiPropertyOptional({
    example: 'uuid-agence-1234',
    description: "L'agence LPO de rattachement (si ADMIN ou EDITOR)",
  })
  @IsOptional()
  @IsString()
  agenceId?: string;
}
