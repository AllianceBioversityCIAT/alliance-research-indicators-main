import { Injectable } from '@nestjs/common';
import { BaseServiceSimple } from '../../shared/global-dto/base-service';
import { ResultNotableReference } from './entities/result-notable-reference.entity';
import { DataSource, Repository } from 'typeorm';
import { CurrentUserUtil } from '../../shared/utils/current-user.util';

@Injectable()
export class ResultNotableReferencesService extends BaseServiceSimple<
  ResultNotableReference,
  Repository<ResultNotableReference>
> {
  constructor(
    private readonly dataSource: DataSource,
    currentUser: CurrentUserUtil,
  ) {
    super(
      ResultNotableReference,
      dataSource.getRepository(ResultNotableReference),
      'result_id',
      currentUser,
    );
  }
}
