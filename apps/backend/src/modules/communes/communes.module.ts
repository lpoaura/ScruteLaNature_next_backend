import { Module } from '@nestjs/common';
import { CommunesService } from './communes.service';
import { CommunesController } from './communes.controller';
import { DatabaseModule } from '../../database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [CommunesController],
  providers: [CommunesService],
  exports: [CommunesService],
})
export class CommunesModule {}
