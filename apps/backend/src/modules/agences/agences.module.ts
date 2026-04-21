import { Module } from '@nestjs/common';
import { AgencesService } from './agences.service';
import { AgencesController } from './agences.controller';
import { DatabaseModule } from '../../database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [AgencesController],
  providers: [AgencesService],
  exports: [AgencesService],
})
export class AgencesModule {}
