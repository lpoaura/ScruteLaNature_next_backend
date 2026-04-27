import { IsOptional, IsString, IsBoolean } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';

export class SearchParcoursDto {
  @ApiPropertyOptional({
    description: 'Filtrer par zonage (UUID)',
    example: 'uuid-zonage-1234',
  })
  @IsOptional()
  @IsString()
  zonageId?: string;

  @ApiPropertyOptional({
    description: 'Accessible aux personnes à mobilité réduite (PMR)',
    example: true,
  })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  isPMRFriendly?: boolean;

  @ApiPropertyOptional({
    description: 'Adapté aux enfants',
    example: false,
  })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  isChildFriendly?: boolean;

  @ApiPropertyOptional({
    description: 'Adapté aux personnes avec handicap mental',
    example: false,
  })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  isMentalHandicapFriendly?: boolean;
}
