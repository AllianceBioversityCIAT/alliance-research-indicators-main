import { Injectable } from '@nestjs/common';
import { IndicatorRepository } from './repository/indicators.repository';
import { ControlListBaseService } from '../../shared/global-dto/clarisa-base-service';
import { Indicator } from './entities/indicator.entity';
import { CurrentUserUtil } from '../../shared/utils/current-user.util';

@Injectable()
export class IndicatorsService extends ControlListBaseService<
  Indicator,
  IndicatorRepository
> {
  constructor(currentUser: CurrentUserUtil, customRepo: IndicatorRepository) {
    super(Indicator, customRepo, currentUser);
  }

  async findAll() {
    return await this.mainRepo.find({
      where: {
        is_active: true,
      },
      relations: {
        indicatorType: true,
      },
      order: {
        position: 'ASC',
      },
    });
  }

  async customFindOne(id: number) {
    return await this.mainRepo.findOne({
      where: {
        indicator_id: id,
        is_active: true,
      },
      relations: {
        indicatorType: true,
      },
      order: {
        position: 'ASC',
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
