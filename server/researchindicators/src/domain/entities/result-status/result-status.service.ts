import { Injectable } from '@nestjs/common';
import { ControlListBaseService } from '../../shared/global-dto/clarisa-base-service';
import { ResultStatus } from './entities/result-status.entity';
import { CurrentUserUtil } from '../../shared/utils/current-user.util';
import { ResultStatusRepository } from './repositories/result-status.repository';
import { In } from 'typeorm';
import { ResultStatusEnum } from './enum/result-status.enum';

@Injectable()
export class ResultStatusService extends ControlListBaseService<
  ResultStatus,
  ResultStatusRepository
> {
  constructor(
    currentUser: CurrentUserUtil,
    customRepo: ResultStatusRepository,
  ) {
    super(ResultStatus, customRepo, currentUser);
  }

  async findAmountOfResultsByStatusCurrentUser() {
    return this.mainRepo.findAmountOfResultsByStatusCurrentUser();
  }

  async findReviewStatuses() {
    return this.mainRepo.find({
      where: {
        is_active: true,
        result_status_id: In([
          ResultStatusEnum.APPROVED,
          ResultStatusEnum.REJECTED,
          ResultStatusEnum.REVISED,
        ]),
      },
    });
  }
}
