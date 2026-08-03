import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { ResultPoolFundingAlignmentSp } from '../entities/result-pool-funding-alignment-sp.entity';

@Injectable()
export class ResultPoolFundingAlignmentSpRepository extends Repository<ResultPoolFundingAlignmentSp> {
  constructor(dataSource: DataSource) {
    super(ResultPoolFundingAlignmentSp, dataSource.createEntityManager());
  }
}
