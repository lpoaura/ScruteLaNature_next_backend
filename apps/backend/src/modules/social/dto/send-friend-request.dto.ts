import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, MinLength } from 'class-validator';

/**
 * On envoie une demande par pseudo (identifiant public du joueur).
 * On évite d'exposer les emails dans une API sociale.
 */
export class SendFriendRequestDto {
  @ApiProperty({
    description: 'Le pseudo du joueur à qui envoyer la demande',
    example: 'Ornitho42',
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  pseudo: string;
}
