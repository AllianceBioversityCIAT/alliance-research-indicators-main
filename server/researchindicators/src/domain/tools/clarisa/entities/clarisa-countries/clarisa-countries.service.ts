import { Injectable } from '@nestjs/common';
import { DataSource, In, Repository } from 'typeorm';
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

  async findByIso2(iso2: string[]) {
    return this.mainRepo.find({
      where: {
        isoAlpha2: In(iso2),
      },
    });
  }

  async findByUm49Codes(um49Code: number[]): Promise<ClarisaCountry[]> {
    return this.mainRepo.find({
      where: {
        code: In(um49Code),
      },
    });
  }
}
