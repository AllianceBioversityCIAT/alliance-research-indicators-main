import { Injectable } from '@nestjs/common';
import { Portfolio } from '../entities/portfolio.entity';
import { DataSource, Repository } from 'typeorm';

@Injectable()
export class PortfoliosRepository extends Repository<Portfolio> {
  constructor(dataSource: DataSource) {
    super(Portfolio, dataSource.createEntityManager());
  }
}
