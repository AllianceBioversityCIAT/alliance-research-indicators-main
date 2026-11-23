import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { ControlListValue } from '../entities/control-list-value.entity';

@Injectable()
export class ControlListValueRepository extends Repository<ControlListValue> {
  constructor(dataSource: DataSource) {
    super(ControlListValue, dataSource.createEntityManager());
  }
}
