import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ResultReviewHistory } from './entities/result-review-history.entity';
import { ResultReviewHistoryRepository } from './repositories/result-review-history.repository';

@Module({
  imports: [TypeOrmModule.forFeature([ResultReviewHistory])],
  providers: [ResultReviewHistoryRepository],
  exports: [TypeOrmModule, ResultReviewHistoryRepository],
})
export class ResultReviewHistoryModule {}
