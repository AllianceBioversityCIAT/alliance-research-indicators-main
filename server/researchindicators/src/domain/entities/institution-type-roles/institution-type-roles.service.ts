import { Injectable } from '@nestjs/common';
import { InstitutionTypeRole } from './entities/institution-type-role.entity';
import { DataSource, Repository } from 'typeorm';
import { CurrentUserUtil } from '../../shared/utils/current-user.util';
import { ControlListBaseService } from '../../shared/global-dto/clarisa-base-service';

@Injectable()
export class InstitutionTypeRolesService extends ControlListBaseService<
  InstitutionTypeRole,
  Repository<InstitutionTypeRole>
> {
  constructor(currentUser: CurrentUserUtil, dataSource: DataSource) {
    super(
      InstitutionTypeRole,
      dataSource.getRepository(InstitutionTypeRole),
      currentUser,
      'name',
    );
  }
}
