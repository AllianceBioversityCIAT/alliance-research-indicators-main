import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { ClarisaCountry } from './entities/clarisa-country.entity';
import { ControlListBaseService } from '../../../../shared/global-dto/clarisa-base-service';
import { CurrentUserUtil } from '../../../../shared/utils/current-user.util';
@Injectable()
export class ClarisaCountriesService extends ControlListBaseService<
  ClarisaCountry,
  Repository<ClarisaCountry>
> {
  constructor(dataSource: DataSource, currentUser: CurrentUserUtil) {
    super(
      ClarisaCountry,
      dataSource.getRepository(ClarisaCountry),
      currentUser,
    );
  }
}
