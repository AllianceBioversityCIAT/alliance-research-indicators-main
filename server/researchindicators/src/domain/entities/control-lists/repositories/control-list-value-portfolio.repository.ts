import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { ControlListValuePortfolio } from '../entities/control-list-value-portfolio.entity';

@Injectable()
export class ControlListValuePortfolioRepository extends Repository<ControlListValuePortfolio> {
  constructor(dataSource: DataSource) {
    super(ControlListValuePortfolio, dataSource.createEntityManager());
  }
}
