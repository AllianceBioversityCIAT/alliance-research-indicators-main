import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { IndicatorRepository } from './repository/indicators.repository';

@Injectable()
export class IndicatorsService {
  constructor(
    dataSource: DataSource,
    private readonly mainRepo: IndicatorRepository,
  ) {}

  async findAll() {
    return await this.mainRepo.find({
      where: {
        is_active: true,
      },
      relations: {
        indicatorType: true,
      },
    });
  }

  async findOne(id: number) {
    return await this.mainRepo.findOne({
      where: {
        indicator_id: id,
        is_active: true,
      },
      relations: {
        indicatorType: true,
      },
    });
  }

  async findIndicatorByAmmountResults() {
    return this.mainRepo.findIndicatorByAmmountResults();
  }

  async findResultsAmountByIndicatorCurrentUser() {
    return this.mainRepo.findAmountResultsByIndicatorCurrentUser();
  }
}
