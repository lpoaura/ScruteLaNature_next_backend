import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsUUID } from 'class-validator';

export class SendParcoursInvitationDto {
  @ApiProperty({ description: "ID du joueur invité" })
  @IsUUID()
  @IsNotEmpty()
  receiverId: string;

  @ApiProperty({ description: "ID du parcours" })
  @IsUUID()
  @IsNotEmpty()
  parcoursId: string;
}
