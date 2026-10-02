import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { ControlList } from '../entities/control-list.entity';

@Injectable()
export class ControlListRepository extends Repository<ControlList> {
  constructor(dataSource: DataSource) {
    super(ControlList, dataSource.createEntityManager());
  }
}
