import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { InstitutionalObjectiveElement } from '../entities/institutional-objective-element.entity';

@Injectable()
export class InstitutionalObjectiveElementRepository extends Repository<InstitutionalObjectiveElement> {
  constructor(dataSource: DataSource) {
    super(InstitutionalObjectiveElement, dataSource.createEntityManager());
  }
}
