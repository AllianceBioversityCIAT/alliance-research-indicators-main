import { Injectable } from '@nestjs/common';
import { ResultCountry } from './entities/result-country.entity';
import { DataSource, Repository } from 'typeorm';
import { BaseServiceSimple } from '../../shared/global-dto/base-service';
import { CountryRolesEnum } from '../country-roles/enums/country-roles.anum';
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

  async findOneCountryByRoleResult(
    resultId: number,
    country_role_id: CountryRolesEnum,
  ) {
    return this.mainRepo.findOne({
      where: {
        country_role_id: country_role_id,
        result_id: resultId,
        is_active: true,
      },
    });
  }
}
