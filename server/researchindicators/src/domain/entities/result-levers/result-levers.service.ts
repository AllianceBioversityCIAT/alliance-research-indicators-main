import { Injectable } from '@nestjs/common';
import { ResultLeversRepository } from './repositories/result-levers.repository';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { ResultLever } from './entities/result-lever.entity';
import { updateArray } from '../../shared/utils/array.util';
import { selectManager } from '../../shared/utils/orm.util';

@Injectable()
export class ResultLeversService {
  constructor(
    private readonly mainRepo: ResultLeversRepository,
    private dataSource: DataSource,
  ) {}

  async create(
    result_id: number,
    lever_id: string | string[],
    lever_role_id: number,
    manager?: EntityManager,
  ) {
    const entityManager: Repository<ResultLever> = selectManager(
      manager,
      ResultLever,
      this.mainRepo,
    );

    let leverId = Array.isArray(lever_id) ? lever_id : [lever_id];
    const existData = await this.mainRepo.find({
      where: {
        result_id: result_id,
        lever_role_id: lever_role_id,
      },
    });

    const formatDataLever: Partial<ResultLever>[] = leverId.map((data) => ({
      lever_role_id: lever_role_id,
      lever_id: data,
    }));

    const updateResultLever = updateArray<ResultLever>(
      formatDataLever,
      existData,
      'result_lever_id',
      {
        key: 'result_id',
        value: result_id,
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
