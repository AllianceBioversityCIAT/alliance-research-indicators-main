import { Injectable } from '@nestjs/common';
import { BaseServiceSimple } from '../../shared/global-dto/base-service';
import { ResultCountriesSubNational } from './entities/result-countries-sub-national.entity';
import { DataSource, Repository } from 'typeorm';
import { CurrentUserUtil } from '../../shared/utils/current-user.util';
@Injectable()
export class ResultCountriesSubNationalsService extends BaseServiceSimple<
  ResultCountriesSubNational,
  Repository<ResultCountriesSubNational>
> {
  constructor(dataSource: DataSource, currentUser: CurrentUserUtil) {
    super(
      ResultCountriesSubNational,
      dataSource.getRepository(ResultCountriesSubNational),
      'result_country_id',
      currentUser,
    );
  }
}
