import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { ClarisaRegion } from './entities/clarisa-region.entity';
import { ControlListBaseService } from '../../../../shared/global-dto/clarisa-base-service';
@Injectable()
export class ClarisaRegionsService extends ControlListBaseService<
  ClarisaRegion,
  Repository<ClarisaRegion>
> {
  constructor(dataSource: DataSource) {
    super(ClarisaRegion, dataSource.getRepository(ClarisaRegion));
  }
}
