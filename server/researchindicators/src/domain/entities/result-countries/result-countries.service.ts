import { Injectable } from '@nestjs/common';
import { ResultCountry } from './entities/result-country.entity';
import { DataSource, Repository } from 'typeorm';
import { BaseServiceSimple } from '../../shared/global-dto/base-service';
@Injectable()
export class ResultCountriesService extends BaseServiceSimple<
  ResultCountry,
  Repository<ResultCountry>
> {
  constructor(private dataSource: DataSource) {
    super(
      ResultCountry,
      dataSource.getRepository(ResultCountry),
      'result_id',
      'country_role_id',
    );
  }
}
