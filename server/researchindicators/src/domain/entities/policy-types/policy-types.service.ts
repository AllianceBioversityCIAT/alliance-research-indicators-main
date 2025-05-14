import { Injectable } from '@nestjs/common';
import { ControlListBaseService } from '../../shared/global-dto/clarisa-base-service';
import { PolicyType } from './entities/policy-type.entity';
import { DataSource, Repository } from 'typeorm';
import { CurrentUserUtil } from '../../shared/utils/current-user.util';

@Injectable()
export class PolicyTypesService extends ControlListBaseService<
  PolicyType,
  Repository<PolicyType>
> {
  constructor(dataSource: DataSource, currentUser: CurrentUserUtil) {
    super(
      PolicyType,
      dataSource.getRepository(PolicyType),
      currentUser,
      'name',
    );
  }
}
