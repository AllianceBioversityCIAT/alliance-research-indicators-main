import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { ControlListBaseService } from '../../shared/global-dto/clarisa-base-service';
import { SessionLength } from './entities/session-length.entity';
@Injectable()
export class SessionLengthsService extends ControlListBaseService<
  SessionLength,
  Repository<SessionLength>
> {
  constructor(dataSource: DataSource) {
    super(SessionLength, dataSource.getRepository(SessionLength));
  }
}
