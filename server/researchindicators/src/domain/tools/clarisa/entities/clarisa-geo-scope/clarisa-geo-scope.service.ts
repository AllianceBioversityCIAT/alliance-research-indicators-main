import { Injectable } from '@nestjs/common';
import { ControlListBaseService } from '../../../../shared/global-dto/clarisa-base-service';
import { ClarisaGeoScope } from './entities/clarisa-geo-scope.entity';
import { DataSource, Repository } from 'typeorm';
@Injectable()
export class ClarisaGeoScopeService extends ControlListBaseService<
  ClarisaGeoScope,
  Repository<ClarisaGeoScope>
> {
  constructor(dataSource: DataSource) {
    super(ClarisaGeoScope, dataSource.getRepository(ClarisaGeoScope));
  }
}
