import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { ControlListBaseService } from '../../shared/global-dto/clarisa-base-service';
import { SessionLength } from './entities/session-length.entity';
import { CurrentUserUtil } from '../../shared/utils/current-user.util';
@Injectable()
export class SessionLengthsService extends ControlListBaseService<
  SessionLength,
  Repository<SessionLength>
> {
  constructor(dataSource: DataSource, currentUser: CurrentUserUtil) {
    super(SessionLength, dataSource.getRepository(SessionLength), currentUser);
  }
}
