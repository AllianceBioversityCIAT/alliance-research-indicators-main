import { Injectable } from '@nestjs/common';
import { ControlListBaseService } from '../../shared/global-dto/clarisa-base-service';
import { InnovationDevAnticipatedUser } from './entities/innovation-dev-anticipated-user.entity';
import { DataSource, Repository } from 'typeorm';
import { CurrentUserUtil } from '../../shared/utils/current-user.util';

@Injectable()
export class InnovationDevAnticipatedUsersService extends ControlListBaseService<
  InnovationDevAnticipatedUser,
  Repository<InnovationDevAnticipatedUser>
> {
  constructor(currentUser: CurrentUserUtil, dataSource: DataSource) {
    super(
      InnovationDevAnticipatedUser,
      dataSource.getRepository(InnovationDevAnticipatedUser),
      currentUser,
      'name',
    );
  }
}
