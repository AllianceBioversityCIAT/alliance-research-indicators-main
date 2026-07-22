import { Injectable } from '@nestjs/common';
import { ImpactOutcome } from '../entities/impact-outcome.entity';
import { DataSource, Repository } from 'typeorm';

@Injectable()
export class ImpactOutcomesRepository extends Repository<ImpactOutcome> {
  constructor(dataSource: DataSource) {
    super(ImpactOutcome, dataSource.createEntityManager());
  }
}
