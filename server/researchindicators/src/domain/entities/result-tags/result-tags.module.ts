import { Module } from '@nestjs/common';
import { ResultTagsService } from './result-tags.service';
import { ResultTagsController } from './result-tags.controller';

@Module({
  controllers: [ResultTagsController],
  providers: [ResultTagsService],
  exports: [ResultTagsService],
})
export class ResultTagsModule {}
