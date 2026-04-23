import { PartialType } from '@nestjs/swagger';
import { CreateEtapeDto } from './create-etape.dto';

export class UpdateEtapeDto extends PartialType(CreateEtapeDto) {}
