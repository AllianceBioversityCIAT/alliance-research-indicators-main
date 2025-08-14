import { Injectable } from '@nestjs/common';
import { ControlListBaseService } from '../../../../shared/global-dto/clarisa-base-service';
import { ClarisaInnovationReadinessLevel } from './entities/clarisa-innovation-readiness-level.entity';
import { DataSource, Repository } from 'typeorm';
import { CurrentUserUtil } from '../../../../shared/utils/current-user.util';

@Injectable()
export class ClarisaInnovationReadinessLevelsService extends ControlListBaseService<
  ClarisaInnovationReadinessLevel,
  Repository<ClarisaInnovationReadinessLevel>
> {
  constructor(currentUser: CurrentUserUtil, dataSource: DataSource) {
    super(
      ClarisaInnovationReadinessLevel,
      dataSource.getRepository(ClarisaInnovationReadinessLevel),
      currentUser,
      'name',
    );
  }

  async findByValue(value: number) {
    return this.mainRepo.findOne({
      where: {
        is_active: true,
        level: value,
      },
    });
  }
}
