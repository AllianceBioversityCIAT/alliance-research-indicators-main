import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { FrameworkElementResponsible } from '../entities/framework-element-responsible.entity';

@Injectable()
export class FrameworkElementResponsibleRepository extends Repository<FrameworkElementResponsible> {
  constructor(dataSource: DataSource) {
    super(FrameworkElementResponsible, dataSource.createEntityManager());
  }
}
