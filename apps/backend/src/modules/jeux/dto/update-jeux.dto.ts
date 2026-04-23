import { PartialType } from '@nestjs/swagger';
import { CreateJeuDto } from './create-jeux.dto';

export class UpdateJeuDto extends PartialType(CreateJeuDto) {}
