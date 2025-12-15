import { Injectable } from '@nestjs/common';
import { DataSource, In, Repository } from 'typeorm';
import { ClarisaRegion } from './entities/clarisa-region.entity';
import { ControlListBaseService } from '../../../../shared/global-dto/clarisa-base-service';
import { CurrentUserUtil } from '../../../../shared/utils/current-user.util';
@Injectable()
export class ClarisaRegionsService extends ControlListBaseService<
  ClarisaRegion,
  Repository<ClarisaRegion>
> {
  constructor(dataSource: DataSource, currentUser: CurrentUserUtil) {
    super(ClarisaRegion, dataSource.getRepository(ClarisaRegion), currentUser);
  }

  async findByUm49Codes(um49Code: number[]): Promise<ClarisaRegion[]> {
    return this.mainRepo.find({
      where: {
        um49Code: In(um49Code),
      },
    });
  }
}
