import { Injectable } from '@nestjs/common';
import { BaseServiceSimple } from '../../shared/global-dto/base-service';
import { TempResultExternalOicr } from './entities/temp_result_external_oicr.entity';
import { DataSource, Repository } from 'typeorm';
import { CurrentUserUtil } from '../../shared/utils/current-user.util';
import { TempExternalOicr } from './entities/temp_external_oicr.entity';
import { CreateResultOicrDto } from '../result-oicr/dto/create-result-oicr.dto';
import { ResultLever } from '../result-levers/entities/result-lever.entity';
import { ResultCountry } from '../result-countries/entities/result-country.entity';
import { ResultRegion } from '../result-regions/entities/result-region.entity';
import { SaveGeoLocationDto } from '../results/dto/save-geo-location.dto';
import { ResultUser } from '../result-users/entities/result-user.entity';

@Injectable()
export class TempExternalOicrsService extends BaseServiceSimple<
  TempResultExternalOicr,
  Repository<TempResultExternalOicr>
> {
  private readonly exteralRepo: Repository<TempExternalOicr>;
  constructor(dataSource: DataSource, currentUser: CurrentUserUtil) {
    super(
      TempResultExternalOicr,
      dataSource.getRepository(TempResultExternalOicr),
      'result_id',
      currentUser,
    );
    this.exteralRepo = dataSource.getRepository(TempExternalOicr);
  }

  async findExternalOicrs() {
    return this.exteralRepo.find({
      where: {
        is_active: true,
      },
    });
  }

  async metadata(externalOicrsId: number): Promise<CreateResultOicrDto> {
    const preLoad: CreateResultOicrDto = new CreateResultOicrDto();

    const resExternal = await this.exteralRepo.findOne({
      where: {
        id: externalOicrsId,
      },
    });

    const mainContactPerson: Partial<ResultUser>[] =
      resExternal?.main_contact_person_list
        ?.split(';')
        .map((item) => ({ user_id: item.trim() }));

    const leverList: Partial<ResultLever>[] = resExternal?.lever_list
      ?.split(';')
      .map((item) => ({
        lever_id: item.trim(),
      }));

    const geoLocation: SaveGeoLocationDto = new SaveGeoLocationDto();

    geoLocation.countries = resExternal?.country_list
      ?.split(';')
      .map((item) => ({
        isoAlpha2: item.trim(),
      })) as ResultCountry[];

    geoLocation.regions = resExternal?.region_list?.split(';').map((item) => ({
      region_id: parseInt(item.trim()),
    })) as ResultRegion[];

    geoLocation.geo_scope_id = resExternal?.geo_scope_id;
    geoLocation.comment_geo_scope = resExternal?.geo_scope_comment;

    preLoad.extra_info.maturity_level = parseInt(resExternal?.maturity_level);
    preLoad.step_one.main_contact_person = mainContactPerson?.[0] as ResultUser;
    preLoad.step_two.contributor_lever = leverList as ResultLever[];
    preLoad.step_three = geoLocation;

    return preLoad;
  }
}
