import { Injectable } from '@nestjs/common';
import { InformativeRole } from './entities/informative-role.entity';
import { DataSource, Repository } from 'typeorm';
import { CurrentUserUtil } from '../../shared/utils/current-user.util';
import { ControlListBaseService } from '../../shared/global-dto/clarisa-base-service';

@Injectable()
export class InformativeRolesService extends ControlListBaseService<
  InformativeRole,
  Repository<InformativeRole>
> {
  constructor(currentUser: CurrentUserUtil, dataSource: DataSource) {
    super(
      InformativeRole,
      dataSource.getRepository(InformativeRole),
      currentUser,
      'name',
    );
  }
}
