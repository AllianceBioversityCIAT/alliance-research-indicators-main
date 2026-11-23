import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { InstitutionalObjective } from '../entities/institutional-objective.entity';

@Injectable()
export class InstitutionalObjectiveRepository extends Repository<InstitutionalObjective> {
  constructor(dataSource: DataSource) {
    super(InstitutionalObjective, dataSource.createEntityManager());
  }
}
