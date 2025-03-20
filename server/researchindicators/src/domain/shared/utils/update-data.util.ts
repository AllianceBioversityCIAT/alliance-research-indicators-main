import { Injectable } from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';
import { Result } from '../../entities/results/entities/result.entity';
import { selectManager } from './orm.util';

@Injectable()
export class UpdateDataUtil {
  constructor(private readonly dataSource: DataSource) {}

  async updateLastUpdatedDate(resultId: number, manager?: EntityManager) {
    const repo = selectManager(
      manager,
      Result,
      this.dataSource.getRepository(Result),
    );
    return repo.update(resultId, {});
  }
}
