import { ConflictException, Injectable } from '@nestjs/common';
import { GreenCheckRepository } from './repository/green-checks.repository';
import { FindGreenChecksDto } from './dto/find-green-checks.dto';
import { DataSource } from 'typeorm';
import { Result } from '../results/entities/result.entity';
import { ResultStatusEnum } from '../result-status/enum/result-status.enum';
import { SubmissionHistory } from './entities/submission-history.entity';
import {
  CurrentUserUtil,
  SetAutitEnum,
} from '../../shared/utils/current-user.util';

@Injectable()
export class GreenChecksService {
  constructor(
    private readonly greenCheckRepository: GreenCheckRepository,
    private readonly dataSource: DataSource,
    private readonly currentUserUtil: CurrentUserUtil,
  ) {}

  async findByResultId(resultId: number) {
    const greenChecks: FindGreenChecksDto =
      await this.greenCheckRepository.calculateGreenChecks(resultId);
    let completness = true;

    for (const key in greenChecks) {
      completness = completness && greenChecks[key];
    }

    greenChecks.completness = completness;
    return greenChecks;
  }

  async submmitedAndUnsubmmitedProcess(resultId: number, comment: string) {
    const validation = await this.greenCheckRepository.canSubmit(
      this.currentUserUtil.user_id,
      resultId,
    );

    if (!validation) {
      throw new ConflictException('You are not allowed to submit this result');
    }

    const status: number = await this.dataSource
      .getRepository(Result)
      .findOne({
        where: {
          result_id: resultId,
          is_active: true,
        },
      })
      .then((result) => result.result_status_id);

    if (status === ResultStatusEnum.ACCEPTED) {
      throw new ConflictException("Can't unsubmit an accepted result");
    }

    const result_status_id =
      status === ResultStatusEnum.SUBMITTED
        ? ResultStatusEnum.DRAFT
        : ResultStatusEnum.SUBMITTED;

    const { completness } = await this.findByResultId(resultId);
    if (
      ResultStatusEnum.SUBMITTED === result_status_id &&
      completness === false
    ) {
      throw new ConflictException('The result is not complete');
    }

    await this.dataSource.transaction(async (manager) => {
      await manager.getRepository(Result).update(resultId, {
        result_status_id,
        ...this.currentUserUtil.audit(SetAutitEnum.UPDATE),
      });

      await manager.getRepository(SubmissionHistory).insert({
        result_id: resultId,
        submission_comment: comment,
        from_status_id: status,
        to_status_id: result_status_id,
        ...this.currentUserUtil.audit(SetAutitEnum.NEW),
      });
    });

    return status;
  }

  async getSubmissionHistory(resultId: number): Promise<SubmissionHistory[]> {
    return this.greenCheckRepository.getSubmissionHistory(resultId);
  }
}
