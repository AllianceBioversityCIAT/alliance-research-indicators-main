import { Injectable } from '@nestjs/common';
import { BaseServiceSimple } from '../../shared/global-dto/base-service';
import { ResultActor } from './entities/result-actor.entity';
import { DataSource, Repository } from 'typeorm';
import { CurrentUserUtil } from '../../shared/utils/current-user.util';

@Injectable()
export class ResultActorsService extends BaseServiceSimple<
  ResultActor,
  Repository<ResultActor>
> {
  constructor(
    private readonly dataSource: DataSource,
    currentUser: CurrentUserUtil,
  ) {
    super(
      ResultActor,
      dataSource.getRepository(ResultActor),
      'result_id',
      currentUser,
      'actor_role_id',
    );
  }
}
