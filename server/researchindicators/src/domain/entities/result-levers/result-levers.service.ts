import { Injectable } from '@nestjs/common';
import { ResultLeversRepository } from './repositories/result-levers.repository';
import { DataSource, EntityManager, In, Not, Repository } from 'typeorm';
import { ResultLever } from './entities/result-lever.entity';
import { filterPersistKey, updateArray } from '../../shared/utils/array.util';
import { selectManager } from '../../shared/utils/orm.util';

@Injectable()
export class ResultLeversService {
  constructor(
    private readonly mainRepo: ResultLeversRepository,
    private dataSource: DataSource,
  ) {}

  async create(
    result_id: number,
    levers: Partial<ResultLever> | Partial<ResultLever>[],
    lever_role_id: number,
    manager?: EntityManager,
  ) {
    const entityManager: Repository<ResultLever> = selectManager(
      manager,
      ResultLever,
      this.mainRepo,
    );

    const leversArray = Array.isArray(levers) ? levers : [levers];
    const existData = await this.mainRepo.find({
      where: {
        result_id: result_id,
        lever_role_id: lever_role_id,
        lever_id: In(leversArray.map((data) => data.lever_id)),
      },
    });

    const formatDataLever: Partial<ResultLever>[] = leversArray.map((data) => ({
      result_lever_id: data?.result_lever_id,
      lever_role_id: lever_role_id,
      lever_id: data.lever_id,
    }));

    const updateResultLever = updateArray<ResultLever>(
      formatDataLever,
      existData,
      'lever_id',
      {
        key: 'result_id',
        value: result_id,
      },
      'result_lever_id',
    );

    const persistId = filterPersistKey<ResultLever>(
      'result_lever_id',
      updateResultLever,
    );

    await entityManager.update(
      {
        result_id: result_id,
        result_lever_id: Not(In(persistId)),
        lever_role_id: lever_role_id,
      },
      {
        is_active: false,
      },
    );

    const response = (await entityManager.save(updateResultLever)).filter(
      (data) => data.is_active === true,
    );

    return response;
  }

  async deleteAll(result_id: number, manager?: EntityManager) {
    const entityManager: Repository<ResultLever> = selectManager(
      manager,
      ResultLever,
      this.mainRepo,
    );

    const response = await entityManager.update(
      { result_id: result_id },
      { is_active: false },
    );

    return response;
  }
}
