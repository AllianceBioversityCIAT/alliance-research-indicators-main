import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { IndicatorType } from './entities/indicator-type.entity';

@Injectable()
export class IndicatorTypesService {
  private readonly mainRepo: Repository<IndicatorType>;
  constructor(dataSource: DataSource) {
    this.mainRepo = dataSource.getRepository(IndicatorType);
  }

  async findAll() {
    return this.mainRepo.find({
      where: {
        is_active: true,
      },
      relations: {
        indicators: true,
      },
    });
  }
}
