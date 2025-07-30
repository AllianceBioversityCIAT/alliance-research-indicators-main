import { Injectable } from '@nestjs/common';
import { ControlListBaseService } from '../../shared/global-dto/clarisa-base-service';
import { IpRightsApplicationOption } from './entities/ip-rights-application-option.entity';
import { DataSource, Repository } from 'typeorm';
import { CurrentUserUtil } from '../../shared/utils/current-user.util';

@Injectable()
export class IpRightsApplicationOptionsService extends ControlListBaseService<
  IpRightsApplicationOption,
  Repository<IpRightsApplicationOption>
> {
  constructor(dataSource: DataSource, currentUser: CurrentUserUtil) {
    super(
      IpRightsApplicationOption,
      dataSource.getRepository(IpRightsApplicationOption),
      currentUser,
    );
  }
}
