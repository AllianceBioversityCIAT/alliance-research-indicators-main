import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { OrgUnitChangeLog } from '../entities/org-unit-change-log.entity';

@Injectable()
export class OrgUnitChangeLogRepository extends Repository<OrgUnitChangeLog> {
  constructor(dataSource: DataSource) {
    super(OrgUnitChangeLog, dataSource.createEntityManager());
  }
}
