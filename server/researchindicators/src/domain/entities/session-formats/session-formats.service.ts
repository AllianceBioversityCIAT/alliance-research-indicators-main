import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { SessionFormat } from './entities/session-format.entity';
import { ControlListBaseService } from '../../shared/global-dto/clarisa-base-service';
import { CurrentUserUtil } from '../../shared/utils/current-user.util';
@Injectable()
export class SessionFormatsService extends ControlListBaseService<
  SessionFormat,
  Repository<SessionFormat>
> {
  constructor(dataSource: DataSource, currentUser: CurrentUserUtil) {
    super(SessionFormat, dataSource.getRepository(SessionFormat), currentUser);
  }
}
