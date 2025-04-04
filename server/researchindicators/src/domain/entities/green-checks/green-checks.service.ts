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
import { MessageMicroservice } from '../../tools/broker/message.microservice';
import { TemplateService } from '../../shared/auxiliar/template/template.service';
import { TemplateEnum } from '../../shared/auxiliar/template/enum/template.enum';
import {
  FindDataForSubmissionDto,
  FindGeneralDataTemplateDto,
  SubmissionEmailTemplateDataDto,
} from './dto/find-general-data-template.dto';
import { AppConfig } from '../../shared/utils/app-config.util';

@Injectable()
export class GreenChecksService {
  constructor(
    private readonly greenCheckRepository: GreenCheckRepository,
    private readonly dataSource: DataSource,
    private readonly currentUserUtil: CurrentUserUtil,
    private readonly messageMicroservice: MessageMicroservice,
    private readonly templateService: TemplateService,
    private readonly appConfig: AppConfig,
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

      return this.saveHistory(
        resultId,
        tempComment,
        currentStatus,
        status,
      ).then((data) => {
        switch (status) {
          case ResultStatusEnum.REVISED:
            this.prepareEmail(
              resultId,
              ResultStatusEnum.SUBMITTED,
              ResultStatusEnum.REVISED,
              TemplateEnum.REVISE_RESULT,
              (data) =>
                `[ROAR] Action Required: Revision Requested for Result ${data.title}`,
            );
            break;
          case ResultStatusEnum.REJECTED:
            this.prepareEmail(
              resultId,
              ResultStatusEnum.SUBMITTED,
              ResultStatusEnum.REJECTED,
              TemplateEnum.REJECTED_RESULT,
              (data) => `[ROAR] Result ${data.result_id} Rejected`,
            );
            break;
          case ResultStatusEnum.APPROVED:
            this.prepareEmail(
              resultId,
              ResultStatusEnum.SUBMITTED,
              ResultStatusEnum.APPROVED,
              TemplateEnum.APPROVAL_RESULT,
              (data) => `[ROAR] Result ${data.result_id} has been approved`,
            );
        }
        return data;
      });
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

    /*if (
      ResultStatusEnum.SUBMITTED === result_status_id &&
      completness == false
    ) {
      throw new ConflictException('The result is not complete');
    }*/

    return this.saveHistory(
      resultId,
      comment,
      currentStatus,
      result_status_id,
    ).then(async (res) => {
      if (result_status_id === ResultStatusEnum.SUBMITTED) {
        this.prepareEmailForSubmission(
          resultId,
          (data) =>
            `[ROAR] Result ${resultId}, Action Required: Review New Result Submission`,
        );
      }
      return res;
    });
  }

  async prepareEmail(
    resultId: number,
    toStatusId: ResultStatusEnum,
    fromStatusId: ResultStatusEnum,
    templateName: TemplateEnum,
    subject: (data: FindGeneralDataTemplateDto) => string,
  ) {
    await this.greenCheckRepository
      .getDataForReviseResult(resultId, toStatusId, fromStatusId)
      .then(async (data) => {
        data['url'] =
          `${this.appConfig.ARI_CLIENT_HOST}/result/${resultId}/general-information`;
        const template = await this.templateService._getTemplate(
          templateName,
          data,
        );
        return { template, data };
      })
      .then(({ data, template }) =>
        this.messageMicroservice.sendEmail({
          to: data.sub_email,
          cc: data.rev_email,
          subject: subject(data),
          message: {
            socketFile: Buffer.from(template),
          },
        }),
      );
  }

  //TODO: this method has to be reviewed once the email microservices are modified.
  async prepareEmailForSubmission(
    resultId: number,
    subject: (data: SubmissionEmailTemplateDataDto) => string,
  ) {
    await this.greenCheckRepository
      .getDataForSubmissionResult(resultId)
      .then(async (data) => {
        const newData = {
          pi_name: data.pi_name
            .split(',')
            .map((name) =>
              name
                .trim()
                .toLowerCase()
                .split(' ')
                .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
                .join(' '),
            )
            .join(', '),
          sub_last_name: this.currentUserUtil.user.last_name,
          sub_first_name: this.currentUserUtil.user.first_name,
          result_id: data.result_id,
          title: data.title,
          project_name: data.project_name,
          support_email: this.appConfig.ARI_SUPPORT_EMAIL, //TODO: Generate a support email
          rev_email:
            data.contributor_id == this.currentUserUtil.user_id
              ? data.contributor_email
              : [data.contributor_email, this.currentUserUtil.user.email].join(
                  ', ',
                ),
          url: `${this.appConfig.ARI_CLIENT_HOST}/result/${resultId}/general-information`,
        };
        const template = await this.templateService._getTemplate(
          TemplateEnum.SUBMITTED_RESULT,
          newData,
        );
        return { template, data: newData };
      })
      .then(({ data, template }) =>
        this.messageMicroservice.sendEmail({
          to: this.currentUserUtil.user.email,
          cc: data.rev_email,
          subject: subject(data),
          message: {
            socketFile: Buffer.from(template),
          },
        }),
      );
  }

  async getSubmissionHistory(resultId: number): Promise<SubmissionHistory[]> {
    return this.greenCheckRepository.getSubmissionHistory(resultId);
  }
}
