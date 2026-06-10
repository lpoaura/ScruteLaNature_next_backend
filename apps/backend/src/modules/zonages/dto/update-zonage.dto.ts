import { IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateZonageDto {
  @ApiPropertyOptional({ example: 'Rennes', description: 'Nom officiel du zonage' })
  @IsOptional()
  @IsString()
  @MaxLength(150)
  nom?: string;

  @ApiPropertyOptional({ example: '35', description: 'Code du zonage' })
  @IsOptional()
  @IsString()
  @MaxLength(10)
  code?: string;
}
