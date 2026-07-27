import { Module } from '@nestjs/common';
import { AnecdotesService } from './anecdotes.service';
import { AnecdotesController } from './anecdotes.controller';

@Module({
  controllers: [AnecdotesController],
  providers: [AnecdotesService],
  exports: [AnecdotesService],
})
export class AnecdotesModule {}
