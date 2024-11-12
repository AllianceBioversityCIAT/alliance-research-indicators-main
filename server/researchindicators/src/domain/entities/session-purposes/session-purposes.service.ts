import { Injectable } from '@nestjs/common';
import { ControlListBaseService } from '../../shared/global-dto/clarisa-base-service';
import { DataSource, Repository } from 'typeorm';
import { SessionPurpose } from './entities/session-purpose.entity';
@Injectable()
export class SessionPurposesService extends ControlListBaseService<
  SessionPurpose,
  Repository<SessionPurpose>
> {
  constructor(dataSource: DataSource) {
    super(SessionPurpose, dataSource.getRepository(SessionPurpose));
  }
}
