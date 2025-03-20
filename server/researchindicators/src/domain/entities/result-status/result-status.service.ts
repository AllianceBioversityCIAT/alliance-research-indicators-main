import { Injectable } from '@nestjs/common';
import { ControlListBaseService } from '../../shared/global-dto/clarisa-base-service';
import { ResultStatus } from './entities/result-status.entity';
import { CurrentUserUtil } from '../../shared/utils/current-user.util';
import { ResultStatusRepository } from './repositories/result-status.repository';

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
}
