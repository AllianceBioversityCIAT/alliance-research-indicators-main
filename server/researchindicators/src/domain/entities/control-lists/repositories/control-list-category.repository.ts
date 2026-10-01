import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { ControlListCategory } from '../entities/control-list-category.entity';

@Injectable()
export class ControlListCategoryRepository extends Repository<ControlListCategory> {
  constructor(dataSource: DataSource) {
    super(ControlListCategory, dataSource.createEntityManager());
  }
}
