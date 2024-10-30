import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { ResultKeyword } from './entities/result-keyword.entity';
import { BaseServiceSimple } from '../../shared/global-dto/base-service';
@Injectable()
export class ResultKeywordsService extends BaseServiceSimple<
  ResultKeyword,
  Repository<ResultKeyword>
> {
  constructor(private dataSource: DataSource) {
    super(ResultKeyword, dataSource.getRepository(ResultKeyword), 'result_id');
  }

  transformData(data: string[]): Partial<ResultKeyword>[] {
    return data.map((keyword) => {
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
