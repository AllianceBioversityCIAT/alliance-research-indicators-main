import { Injectable } from '@nestjs/common';
import { ControlListBaseService } from '../../shared/global-dto/clarisa-base-service';
import { DataSource, Repository } from 'typeorm';
import { ResultStatus } from './entities/result-status.entity';

@Injectable()
export class ResultStatusService extends ControlListBaseService<
  ResultStatus,
  Repository<ResultStatus>
> {
  constructor(dataSource: DataSource) {
    super(ResultStatus, dataSource.getRepository(ResultStatus));
  }
}
