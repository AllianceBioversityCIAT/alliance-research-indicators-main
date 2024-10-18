import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { Indicator } from './entities/indicator.entity';

@Injectable()
export class IndicatorsService {
  private readonly mainRepo: Repository<Indicator>;
  constructor(private dataSource: DataSource) {
    this.mainRepo = dataSource.getRepository(Indicator);
  }

  async findAll() {
    return await this.mainRepo.find({
      where: {
        is_active: true,
      },
    });
  }
}
