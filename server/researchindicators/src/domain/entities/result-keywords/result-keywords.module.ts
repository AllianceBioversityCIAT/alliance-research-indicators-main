import { Module } from '@nestjs/common';
import { ResultKeywordsService } from './result-keywords.service';
import { ResultKeywordsController } from './result-keywords.controller';

@Module({
  controllers: [ResultKeywordsController],
  providers: [ResultKeywordsService],
  exports: [ResultKeywordsService],
})
export class ResultKeywordsModule {}
