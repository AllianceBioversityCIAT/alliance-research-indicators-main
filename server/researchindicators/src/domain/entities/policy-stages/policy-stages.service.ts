import { Injectable } from '@nestjs/common';
import { PolicyStage } from './entities/policy-stage.entity';
import { ControlListBaseService } from '../../shared/global-dto/clarisa-base-service';
import { DataSource, Repository } from 'typeorm';
import { CurrentUserUtil } from '../../shared/utils/current-user.util';

@Injectable()
export class PolicyStagesService extends ControlListBaseService<
  PolicyStage,
  Repository<PolicyStage>
> {
  constructor(dataSource: DataSource, currentUser: CurrentUserUtil) {
    super(PolicyStage, dataSource.getRepository(PolicyStage), currentUser);
  }
}
