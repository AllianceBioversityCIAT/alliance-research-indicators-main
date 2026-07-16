import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { StrategicObjective } from '../entities/strategic-objective.entity';

@Injectable()
export class StrategicObjectivesRepository extends Repository<StrategicObjective> {
  constructor(dataSource: DataSource) {
    super(StrategicObjective, dataSource.createEntityManager());
  }
}
