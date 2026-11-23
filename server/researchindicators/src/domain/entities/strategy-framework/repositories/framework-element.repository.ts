import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { FrameworkElement } from '../entities/framework-element.entity';

@Injectable()
export class FrameworkElementRepository extends Repository<FrameworkElement> {
  constructor(dataSource: DataSource) {
    super(FrameworkElement, dataSource.createEntityManager());
  }
}
