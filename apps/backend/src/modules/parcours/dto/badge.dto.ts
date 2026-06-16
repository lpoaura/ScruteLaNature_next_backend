import { IsString, IsNotEmpty, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateBadgeDto {
  @ApiProperty({ example: 'Aigle Royal', description: 'Nom du badge' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;

  @ApiProperty({
    example: 'badge-aigle.png',
    description: "Nom du fichier image du badge",
  })
  @IsString()
  @IsNotEmpty()
  imageUrl: string;
}
