import { Module } from '@nestjs/common';
import { JeuxService } from './jeux.service';
import { JeuxController } from './jeux.controller';

@Module({
  controllers: [JeuxController],
  providers: [JeuxService],
})
export class JeuxModule {}
