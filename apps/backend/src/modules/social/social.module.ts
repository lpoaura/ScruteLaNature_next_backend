import { Module } from '@nestjs/common';
import { SocialService } from './social.service';
import { SocialController, ReviewsController } from './social.controller';
import { DatabaseModule } from '../../database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [SocialController, ReviewsController],
  providers: [SocialService],
})
export class SocialModule {}
