import { Injectable } from '@nestjs/common';
import { ControlListBaseService } from '../../shared/global-dto/clarisa-base-service';
import { LeverStrategicOutcome } from './entities/lever-strategic-outcome.entity';
import { DataSource, Repository } from 'typeorm';
import { CurrentUserUtil } from '../../shared/utils/current-user.util';

@Injectable()
export class LeverStrategicOutcomeService extends ControlListBaseService<
  LeverStrategicOutcome,
  Repository<LeverStrategicOutcome>
> {
  constructor(currentUser: CurrentUserUtil, dataSource: DataSource) {
    super(
      LeverStrategicOutcome,
      dataSource.getRepository(LeverStrategicOutcome),
      currentUser,
      'strategic_outcome',
    );
  }

  async findByLeverId(lever_id: number): Promise<LeverStrategicOutcome[]> {
    return this.mainRepo.find({
      where: { lever_id, is_active: true },
      order: { strategic_outcome: 'ASC' },
    });
  }
}
