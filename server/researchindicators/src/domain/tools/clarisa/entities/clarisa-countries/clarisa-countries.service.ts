import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { ClarisaCountry } from './entities/clarisa-country.entity';
import { ControlListBaseService } from '../../../../shared/global-dto/clarisa-base-service';
@Injectable()
export class ClarisaCountriesService extends ControlListBaseService<
  ClarisaCountry,
  Repository<ClarisaCountry>
> {
  constructor(dataSource: DataSource) {
    super(ClarisaCountry, dataSource.getRepository(ClarisaCountry));
  }
}
