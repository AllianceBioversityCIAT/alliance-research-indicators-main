import { Injectable } from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';
import { Result } from '../../entities/results/entities/result.entity';
import { selectManager } from './orm.util';
import { QueryDeepPartialEntity } from 'typeorm/query-builder/QueryPartialEntity';

@Injectable()
export class UpdateDataUtil {
  constructor(private readonly dataSource: DataSource) {}

  async updateLastUpdatedDate(
    resultId: number,
    manager?: EntityManager,
    userId?: number,
  ) {
    const repo = selectManager(
      manager,
      Result,
      this.dataSource.getRepository(Result),
    );
    const updateData: QueryDeepPartialEntity<Result> = {};
    if (userId) {
      updateData['updated_by'] = userId;
    }
    return repo.update(resultId, updateData);
  }
}
