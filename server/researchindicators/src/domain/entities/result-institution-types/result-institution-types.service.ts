import { Injectable } from '@nestjs/common';
import { BaseServiceSimple } from '../../shared/global-dto/base-service';
import { ResultInstitutionType } from './entities/result-institution-type.entity';
import { DataSource, Repository } from 'typeorm';
import { CurrentUserUtil } from '../../shared/utils/current-user.util';

@Injectable()
export class ResultInstitutionTypesService extends BaseServiceSimple<
  ResultInstitutionType,
  Repository<ResultInstitutionType>
> {
  constructor(
    private readonly dataSource: DataSource,
    currentUser: CurrentUserUtil,
  ) {
    super(
      ResultInstitutionType,
      dataSource.getRepository(ResultInstitutionType),
      'result_id',
      currentUser,
      'institution_type_role_id',
    );
  }
}
