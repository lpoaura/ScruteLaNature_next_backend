import { Module } from '@nestjs/common';
import { ParcoursService } from './parcours.service';
import { ParcoursController } from './parcours.controller';
import { DatabaseModule } from '../../database/database.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [DatabaseModule, NotificationsModule],
  controllers: [ParcoursController],
  providers: [ParcoursService],
  exports: [ParcoursService],
})
export class ParcoursModule {}
