import { Injectable } from '@nestjs/common';
import { ResultCountry } from './entities/result-country.entity';
import { DataSource, EntityManager, In, Not, Repository } from 'typeorm';
import { CountryRolesEnum } from '../country-roles/enums/country-roles.anum';
import { selectManager } from '../../shared/utils/orm.util';
import {
  updateArray,
  filterPersistKey,
  isNotEmpty,
} from '../../shared/utils/array.util';
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

  async create2(
    result_id: number,
    countries: ResultCountry | ResultCountry[],
    country_role_id: CountryRolesEnum,
    manager?: EntityManager,
  ) {
    const entityManager: Repository<ResultCountry> = selectManager(
      manager,
      ResultCountry,
      this.mainRepo,
    );

    if (!isNotEmpty(countries)) return [];

    const countriesArray = Array.isArray(countries) ? countries : [countries];

    const existData = await this.mainRepo.find({
      where: {
        result_id: result_id,
        country_role_id: country_role_id,
        country_id: In(countriesArray.map((data) => data.country_id)),
      },
    });

    const formatDataLever: Partial<ResultCountry>[] = countriesArray.map(
      (data) => ({
        result_country_id: data?.result_country_id,
        country_id: data.country_id,
        country_role_id: country_role_id,
      }),
    );

    const updateResultLever = updateArray<ResultCountry>(
      formatDataLever,
      existData,
      'country_id',
      {
        key: 'result_id',
        value: result_id,
      },
      'result_country_id',
    );

    const persistId = filterPersistKey<ResultCountry>(
      'result_country_id',
      updateResultLever,
    );

    await entityManager.update(
      {
        result_id: result_id,
        result_country_id: Not(In(persistId)),
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
}
