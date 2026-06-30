import { Module } from '@nestjs/common';
import { SocialService } from './social.service';
import { SocialController, ReviewsController, InvitationsController, UsersSearchController } from './social.controller';
import { DatabaseModule } from '../../database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [SocialController, ReviewsController, InvitationsController, UsersSearchController],
  providers: [SocialService],
})
export class SocialModule {}
