import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { BilateralProjectMapping } from '../entities/bilateral-project-mapping.entity';

// @sdd-spec docs/specs/bilateral-module/pending-items — T-15.13 (shell) / T-15.14 (custom methods)
@Injectable()
export class BilateralProjectMappingRepository extends Repository<BilateralProjectMapping> {
  constructor(dataSource: DataSource) {
    super(BilateralProjectMapping, dataSource.createEntityManager());
  }
}
