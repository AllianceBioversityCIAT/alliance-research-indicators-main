import { Injectable } from '@nestjs/common';
import { ControlListBaseService } from '../../shared/global-dto/clarisa-base-service';
import { DataSource, Repository } from 'typeorm';
import { SessionPurpose } from './entities/session-purpose.entity';
import { CurrentUserUtil } from '../../shared/utils/current-user.util';
@Injectable()
export class SessionPurposesService extends ControlListBaseService<
  SessionPurpose,
  Repository<SessionPurpose>
> {
  constructor(dataSource: DataSource, currentUser: CurrentUserUtil) {
    super(
      SessionPurpose,
      dataSource.getRepository(SessionPurpose),
      currentUser,
    );
  }
}
