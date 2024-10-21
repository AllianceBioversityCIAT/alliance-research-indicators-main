import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { ClarisaSubNational } from './entities/clarisa-sub-national.entity';
import { ControlListBaseService } from '../../../../shared/global-dto/clarisa-base-service';

@Injectable()
export class ClarisaSubNationalsService extends ControlListBaseService<
  ClarisaSubNational,
  Repository<ClarisaSubNational>
> {
  constructor(dataSource: DataSource) {
    super(ClarisaSubNational, dataSource.getRepository(ClarisaSubNational));
  }
}
