import {
  BadRequestException,
  ConflictException,
  Injectable,
} from '@nestjs/common';
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
import { ResultStatus } from '../result-status/entities/result-status.entity';
import { isEmpty } from '../../shared/utils/object.utils';

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

  async changeStatus(resultId: number, status: number, comment: string) {
    if (status === ResultStatusEnum.DELETED)
      throw new ConflictException(
        'The deleted status is available only for the delete endpoint',
      );

    const resultStatus = await this.dataSource
      .getRepository(ResultStatus)
      .findOne({
        where: {
          is_active: true,
          result_status_id: status,
        },
      });

    if (!resultStatus) throw new ConflictException('Invalid status');

    const currentStatus: number = await this.dataSource
      .getRepository(Result)
      .findOne({
        where: {
          result_id: resultId,
          is_active: true,
        },
      })
      .then((result) => result.result_status_id);

    if (currentStatus === ResultStatusEnum.APPROVED)
      throw new ConflictException('The result is already approved');
    if ([ResultStatusEnum.DRAFT, ResultStatusEnum.SUBMITTED].includes(status)) {
      return this.submmitedAndUnsubmmitedProcess(
        resultId,
        comment,
        currentStatus,
      );
    } else if (
      [
        ResultStatusEnum.REVISED,
        ResultStatusEnum.APPROVED,
        ResultStatusEnum.REJECTED,
      ].includes(status)
    ) {
      if (currentStatus !== ResultStatusEnum.SUBMITTED)
        throw new ConflictException('Invalid current status');

      const tempComment = ResultStatusEnum.APPROVED === status ? null : comment;

      if (
        [ResultStatusEnum.REVISED, ResultStatusEnum.REJECTED].includes(
          status,
        ) &&
        isEmpty(tempComment)
      )
        throw new BadRequestException('Comment is required');

      return this.saveHistory(resultId, tempComment, currentStatus, status);
    }
  }

  async saveHistory(
    resultId: number,
    comment: string,
    currentStatus: number,
    newStatus: ResultStatusEnum,
  ) {
    return this.dataSource.transaction(async (manager) => {
      await manager.getRepository(Result).update(resultId, {
        result_status_id: newStatus,
        ...this.currentUserUtil.audit(SetAutitEnum.UPDATE),
      });

      const response = await manager.getRepository(SubmissionHistory).insert({
        result_id: resultId,
        submission_comment: comment,
        from_status_id: currentStatus,
        to_status_id: newStatus,
        ...this.currentUserUtil.audit(SetAutitEnum.NEW),
      });

      return response;
    });
  }

  async submmitedAndUnsubmmitedProcess(
    resultId: number,
    comment: string,
    currentStatus: number,
  ) {
    if (
      ![
        ResultStatusEnum.SUBMITTED,
        ResultStatusEnum.DRAFT,
        ResultStatusEnum.REVISED,
      ].includes(currentStatus)
    )
      throw new ConflictException('Invalid current status');

    const validation = await this.greenCheckRepository.canSubmit(
      this.currentUserUtil.user_id,
      resultId,
    );

    if (!validation) {
      throw new ConflictException('You are not allowed to submit this result');
    }

    const result_status_id =
      currentStatus === ResultStatusEnum.SUBMITTED
        ? ResultStatusEnum.DRAFT
        : ResultStatusEnum.SUBMITTED;

    if (result_status_id === ResultStatusEnum.DRAFT && isEmpty(comment))
      throw new BadRequestException('Comment is required');

    const { completness } = await this.findByResultId(resultId);

    if (
      ResultStatusEnum.SUBMITTED === result_status_id &&
      completness == false
    ) {
      throw new ConflictException('The result is not complete');
    }

    return this.saveHistory(resultId, comment, currentStatus, result_status_id);
  }

  async getSubmissionHistory(resultId: number): Promise<SubmissionHistory[]> {
    return this.greenCheckRepository.getSubmissionHistory(resultId);
  }
}
