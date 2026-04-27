import { Module } from '@nestjs/common';
import { ZonagesService } from './zonages.service';
import { ZonagesController } from './zonages.controller';
import { DatabaseModule } from '../../database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [ZonagesController],
  providers: [ZonagesService],
  exports: [ZonagesService],
})
export class ZonagesModule {}
