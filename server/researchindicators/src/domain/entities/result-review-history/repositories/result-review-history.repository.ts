import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { ResultReviewHistory } from '../entities/result-review-history.entity';

@Injectable()
export class ResultReviewHistoryRepository extends Repository<ResultReviewHistory> {
  constructor(dataSource: DataSource) {
    super(ResultReviewHistory, dataSource.createEntityManager());
  }
}
