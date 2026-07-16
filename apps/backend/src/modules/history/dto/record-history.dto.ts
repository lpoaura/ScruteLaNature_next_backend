import { IsString, IsInt, IsOptional, IsDateString } from 'class-validator';

export class RecordHistoryDto {
  @IsString()
  parcoursId: string;

  @IsInt()
  score: number;

  @IsOptional()
  @IsString()
  syncId?: string;

  @IsOptional()
  @IsDateString()
  completedAt?: string;
}
