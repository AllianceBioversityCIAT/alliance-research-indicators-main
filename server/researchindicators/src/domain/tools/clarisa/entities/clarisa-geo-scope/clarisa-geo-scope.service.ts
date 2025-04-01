import { Injectable } from '@nestjs/common';
import { ControlListBaseService } from '../../../../shared/global-dto/clarisa-base-service';
import { ClarisaGeoScope } from './entities/clarisa-geo-scope.entity';
import { DataSource, Like, Repository } from 'typeorm';
import { CurrentUserUtil } from '../../../../shared/utils/current-user.util';
import { ResultCountry } from '../../../../entities/result-countries/entities/result-country.entity';
import { ClarisaGeoScopeEnum } from './enum/clarisa-geo-scope.enum';
@Injectable()
export class ClarisaGeoScopeService extends ControlListBaseService<
  ClarisaGeoScope,
  Repository<ClarisaGeoScope>
> {
  constructor(dataSource: DataSource, currentUser: CurrentUserUtil) {
    super(
      ClarisaGeoScope,
      dataSource.getRepository(ClarisaGeoScope),
      currentUser,
    );
  }

  transformGeoScope(
    id: ClarisaGeoScopeEnum,
    countryData: ResultCountry[],
    isCliToServ: boolean = true,
  ) {
    let tempId = typeof id === 'string' ? parseInt(id) : id;

    if (
      isCliToServ &&
      id == ClarisaGeoScopeEnum.NATIONAL &&
      countryData?.length > 1
    ) {
      tempId = ClarisaGeoScopeEnum.MULTI_NATIONAL;
    } else if (!isCliToServ && id == ClarisaGeoScopeEnum.MULTI_NATIONAL) {
      tempId = ClarisaGeoScopeEnum.NATIONAL;
    }

    return tempId;
  }

  async findByName(name: string) {
    return this.mainRepo.findOne({
      where: {
        name: Like(`%${name}%`),
      },
    });
  }
}
