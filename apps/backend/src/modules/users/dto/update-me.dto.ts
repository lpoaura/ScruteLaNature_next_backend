import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, MaxLength, IsBoolean } from 'class-validator';

/**
 * DTO pour PATCH /users/me
 * Un utilisateur ne peut modifier que ses infos personnelles,
 * PAS son rôle ni son organismeId (réservé aux admins via POST /admin/users).
 */
export class UpdateMeDto {
  @ApiPropertyOptional({ example: 'John', description: 'Prénom' })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  firstName?: string;

  @ApiPropertyOptional({ example: 'Doe', description: 'Nom de famille' })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  lastName?: string;

  @ApiPropertyOptional({ example: 'Ornitho42', description: 'Pseudo unique public' })
  @IsString()
  @IsOptional()
  @MaxLength(50)
  pseudo?: string;

  @ApiPropertyOptional({ description: 'Token push notifications (FCM/APNs)' })
  @IsString()
  @IsOptional()
  pushToken?: string;

  @ApiPropertyOptional({ description: 'Consentement analytics' })
  @IsBoolean()
  @IsOptional()
  analyticsConsent?: boolean;
}
