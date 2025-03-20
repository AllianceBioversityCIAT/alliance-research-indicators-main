import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { ControlListBaseService } from '../../shared/global-dto/clarisa-base-service';
import { SessionType } from './entities/session-type.entity';
import { CurrentUserUtil } from '../../shared/utils/current-user.util';
@Injectable()
export class SessionTypesService extends ControlListBaseService<
  SessionType,
  Repository<SessionType>
> {
  constructor(dataSource: DataSource, currentUser: CurrentUserUtil) {
    super(SessionType, dataSource.getRepository(SessionType), currentUser);
  }
}
