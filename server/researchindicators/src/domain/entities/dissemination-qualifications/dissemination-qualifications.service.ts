import { Injectable } from '@nestjs/common';
import { DisseminationQualification } from './entities/dissemination-qualification.entity';
import { ControlListBaseService } from '../../shared/global-dto/clarisa-base-service';
import { DataSource, Repository } from 'typeorm';
import { CurrentUserUtil } from '../../shared/utils/current-user.util';

@Injectable()
export class DisseminationQualificationsService extends ControlListBaseService<
  DisseminationQualification,
  Repository<DisseminationQualification>
> {
  constructor(dataSource: DataSource, currentUser: CurrentUserUtil) {
    super(
      DisseminationQualification,
      dataSource.getRepository(DisseminationQualification),
      currentUser,
    );
  }
}
