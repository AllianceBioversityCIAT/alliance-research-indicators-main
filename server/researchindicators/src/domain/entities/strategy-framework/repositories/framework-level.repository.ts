import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { FrameworkLevel } from '../entities/framework-level.entity';

@Injectable()
export class FrameworkLevelRepository extends Repository<FrameworkLevel> {
  constructor(dataSource: DataSource) {
    super(FrameworkLevel, dataSource.createEntityManager());
  }
}
