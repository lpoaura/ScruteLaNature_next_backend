import { Module } from '@nestjs/common';
import { MobileService } from './mobile.service';
import { MobileController } from './mobile.controller';
import { DatabaseModule } from '../../database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [MobileController],
  providers: [MobileService],
  exports: [MobileService],
})
export class MobileModule {}
