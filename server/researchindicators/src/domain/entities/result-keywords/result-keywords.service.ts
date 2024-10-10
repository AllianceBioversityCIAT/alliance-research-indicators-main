import { Injectable } from '@nestjs/common';
import { DataSource, EntityManager, In, Not, Repository } from 'typeorm';
import { ResultKeyword } from './entities/result-keyword.entity';
import { selectManager } from '../../shared/utils/orm.util';
import { filterPersistKey, updateArray } from '../../shared/utils/array.util';
import { BaseServiceSimple } from '../../shared/global-dto/base-service';
@Injectable()
export class ResultKeywordsService extends BaseServiceSimple<
  ResultKeyword,
  Repository<ResultKeyword>
> {
  constructor(private dataSource: DataSource) {
    super(ResultKeyword, dataSource.getRepository(ResultKeyword), 'result_id');
  }

  async create2(
    result_id: number,
    keywords: ResultKeyword | ResultKeyword[],
    manager?: EntityManager,
  ) {
    const entityManager: Repository<ResultKeyword> = selectManager(
      manager,
      ResultKeyword,
      this.mainRepo,
    );

    const keywordsArray = Array.isArray(keywords) ? keywords : [keywords];

    const existData = await this.mainRepo.find({
      where: {
        result_id: result_id,
        keyword: In(keywordsArray.map((data) => data.keyword)),
      },
    });

    const formatDataLever: Partial<ResultKeyword>[] = keywordsArray.map(
      (data) => ({
        result_id: result_id,
        keyword: data.keyword,
      }),
    );

    const updateResultLever = updateArray<ResultKeyword>(
      formatDataLever,
      existData,
      'keyword',
      {
        key: 'result_id',
        value: result_id,
      },
      'result_keyword_id',
    );

    const persistId = filterPersistKey<ResultKeyword>(
      'result_keyword_id',
      updateResultLever,
    );

    await entityManager.update(
      {
        result_id: result_id,
        result_keyword_id: Not(In(persistId)),
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

  async findKeywordsByResultId(resultId: number) {
    return this.mainRepo.find({
      where: { result_id: resultId, is_active: true },
    });
  }
}
