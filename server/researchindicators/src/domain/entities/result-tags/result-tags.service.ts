import { Injectable } from '@nestjs/common';
import { BaseServiceSimple } from '../../shared/global-dto/base-service';
import { ResultTag } from './entities/result-tag.entity';
import { DataSource, Repository } from 'typeorm';
import { CurrentUserUtil } from '../../shared/utils/current-user.util';

@Injectable()
export class ResultTagsService extends BaseServiceSimple<
  ResultTag,
  Repository<ResultTag>
> {
  constructor(dataSource: DataSource, currentUser: CurrentUserUtil) {
    super(
      ResultTag,
      dataSource.getRepository(ResultTag),
      'result_id',
      currentUser,
    );
  }
}
