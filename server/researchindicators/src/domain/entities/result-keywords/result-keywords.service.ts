import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { ResultKeyword } from './entities/result-keyword.entity';
import { BaseServiceSimple } from '../../shared/global-dto/base-service';
import { CurrentUserUtil } from '../../shared/utils/current-user.util';
@Injectable()
export class ResultKeywordsService extends BaseServiceSimple<
  ResultKeyword,
  Repository<ResultKeyword>
> {
  constructor(
    private dataSource: DataSource,
    currentUser: CurrentUserUtil,
  ) {
    super(
      ResultKeyword,
      dataSource.getRepository(ResultKeyword),
      'result_id',
      currentUser,
    );
  }

  transformData(data: string[]): Partial<ResultKeyword>[] {
    return data?.map((keyword) => {
      return {
        keyword: keyword,
      } as Partial<ResultKeyword>;
    });
  }

  async findKeywordsByResultId(resultId: number) {
    return this.mainRepo.find({
      where: { result_id: resultId, is_active: true },
    });
  }
}
