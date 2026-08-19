import { IsString, IsOptional, IsEnum, IsUUID } from 'class-validator';
import { ReportType, ReportStatus } from '@prisma/client';

export class CreateSignalementDto {
  @IsEnum(ReportType)
  type: ReportType;

  @IsString()
  @IsOptional()
  description?: string;

  @IsUUID()
  parcoursId: string;

  @IsUUID()
  @IsOptional()
  etapeId?: string;
}

export class UpdateSignalementStatusDto {
  @IsEnum(ReportStatus)
  status: ReportStatus;
}
