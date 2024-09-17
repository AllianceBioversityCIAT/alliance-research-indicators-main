import { ConflictException, Injectable } from '@nestjs/common';
import { ResultLeversRepository } from './repositories/result-levers.repository';
import { DataSource, EntityManager } from 'typeorm';
import { ResultLever } from './entities/result-lever.entity';

@Injectable()
export class ResultLeversService {
  constructor(
    private readonly mainRepo: ResultLeversRepository,
    private dataSource: DataSource,
  ) {}

  async create(result_id: number, lever_id: number, lever_role_id: number) {
    const existData = await this.mainRepo.findOne({
      where: {
        result_id: result_id,
        lever_id: lever_id,
        lever_role_id: lever_role_id,
        is_active: true,
      },
    });

    await this.mainRepo.updateActiveStatus<ResultLever>({
      in: {
        lever_id: lever_id,
        result_id: result_id,
        lever_role_id: lever_role_id,
      },
      not_in: { result_id: existData?.result_lever_id },
    });

    if (existData && existData.is_active) {
      throw new ConflictException('Result lever already exists');
    }

    let tempProces: ResultLever;
    if (existData && !existData.is_active) {
      await this.mainRepo.update(existData.result_lever_id, {
        is_active: true,
      });
      tempProces = { ...existData, is_active: true };
    } else if (!existData) {
      tempProces = await this.mainRepo.save({
        result_id: result_id,
        lever_id: lever_id,
        lever_role_id: lever_role_id,
      });
    }

    return tempProces;
  }
}
