import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { SessionFormat } from './entities/session-format.entity';
import { ControlListBaseService } from '../../shared/global-dto/clarisa-base-service';
@Injectable()
export class SessionFormatsService extends ControlListBaseService<
  SessionFormat,
  Repository<SessionFormat>
> {
  constructor(dataSource: DataSource) {
    super(SessionFormat, dataSource.getRepository(SessionFormat));
  }
}
