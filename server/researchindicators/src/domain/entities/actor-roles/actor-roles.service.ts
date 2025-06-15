import { Injectable } from '@nestjs/common';
import { ControlListBaseService } from '../../shared/global-dto/clarisa-base-service';
import { ActorRole } from './entities/actor-role.entity';
import { DataSource, Repository } from 'typeorm';
import { CurrentUserUtil } from '../../shared/utils/current-user.util';

@Injectable()
export class ActorRolesService extends ControlListBaseService<
  ActorRole,
  Repository<ActorRole>
> {
  constructor(currentUser: CurrentUserUtil, dataSource: DataSource) {
    super(ActorRole, dataSource.getRepository(ActorRole), currentUser, 'name');
  }
}
