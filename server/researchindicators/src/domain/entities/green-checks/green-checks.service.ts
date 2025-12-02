import {
  BadRequestException,
  ConflictException,
  Injectable,
} from '@nestjs/common';
import { GreenCheckRepository } from './repository/green-checks.repository';
import { FindGreenChecksDto } from './dto/find-green-checks.dto';
import { DataSource } from 'typeorm';
import { Result } from '../results/entities/result.entity';
import {
  getTemplateByStatus,
  ResultStatusEnum,
  ResultStatusNameEnum,
} from '../result-status/enum/result-status.enum';
import { SubmissionHistory } from './entities/submission-history.entity';
import {
  CurrentUserUtil,
  SetAutitEnum,
} from '../../shared/utils/current-user.util';
import { ResultStatus } from '../result-status/entities/result-status.entity';
import { isEmpty, validObject } from '../../shared/utils/object.utils';
import { MessageMicroservice } from '../../tools/broker/message.microservice';
import { TemplateService } from '../../shared/auxiliar/template/template.service';
import { TemplateEnum } from '../../shared/auxiliar/template/enum/template.enum';
import { AppConfig } from '../../shared/utils/app-config.util';
import { ResultsUtil } from '../../shared/utils/results.util';
import { IndicatorsEnum } from '../indicators/enum/indicators.enum';
import { ResultOicrService } from '../result-oicr/result-oicr.service';
import { OptionalBody } from './dto/optional-body.dto';
import { MessageOicrDto } from './dto/message-oicr.dto';
import { validateRoles } from '../../shared/utils/roles.util';
import { SecRolesEnum } from '../../shared/enum/sec_role.enum';

@Injectable()
export class GreenChecksService {
  constructor(
    private readonly greenCheckRepository: GreenCheckRepository,
    private readonly dataSource: DataSource,
    private readonly currentUserUtil: CurrentUserUtil,
    private readonly messageMicroservice: MessageMicroservice,
    private readonly templateService: TemplateService,
    private readonly appConfig: AppConfig,
    private readonly _resultsUtil: ResultsUtil,
    private readonly resultOicrService: ResultOicrService,
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

  async statusManagement(
    resultId: number,
    statusId: ResultStatusEnum,
    comment?: string,
    body?: OptionalBody,
  ) {
    if (statusId === ResultStatusEnum.DELETED) {
      throw new ConflictException(
        'The deleted status is available only for the delete endpoint',
      );
    }

    const resultStatusId = await this.dataSource
      .getRepository(ResultStatus)
      .findOne({
        where: {
          is_active: true,
          result_status_id: statusId,
        },
        select: {
          result_status_id: true,
        },
      })
      .then((res) => {
        if (!res) throw new ConflictException('Invalid status');
        return res?.result_status_id;
      });

    const saveHistory = this.processStatus(
      resultId,
      resultStatusId,
      comment,
      this._resultsUtil.statusId,
      body,
    );

    const otherData = await this.otherFunctions(
      resultStatusId,
      this._resultsUtil.statusId,
      body,
    );

    const responseHistory = await this.saveHistory(resultId, saveHistory);

    await this.prepareEmail(
      resultId,
      resultStatusId,
      this._resultsUtil.statusId,
      body,
      responseHistory,
    );

    return otherData ?? responseHistory;
  }

  private processStatus(
    resultId: number,
    status: ResultStatusEnum,
    comment: string,
    currentStatus: ResultStatusEnum,
    body?: OptionalBody,
  ) {
    if (currentStatus === status) {
      throw new ConflictException(
        'The result is already in the desired status',
      );
    }

    this.prevalidateFunctions(status);

    switch (status) {
      case ResultStatusEnum.REVISED:
      case ResultStatusEnum.REJECTED:
      case ResultStatusEnum.APPROVED:
        return this.changeToReviewStatus(
          resultId,
          status,
          comment,
          currentStatus,
        );
      case ResultStatusEnum.SUBMITTED:
      case ResultStatusEnum.DRAFT:
        return this.changeToSubmittedUnsubmitted(
          resultId,
          status,
          comment,
          currentStatus,
          body,
        );
      case ResultStatusEnum.POSTPONE:
        return this.changeToReviewOicrStatus(
          resultId,
          status,
          comment,
          currentStatus,
        );
      case ResultStatusEnum.OICR_APPROVED:
        return this.changeToOicrApproved(
          resultId,
          status,
          comment,
          currentStatus,
        );
      case ResultStatusEnum.SCIENCE_EDITION:
      case ResultStatusEnum.KM_CURATION:
      case ResultStatusEnum.PUBLISHED:
        return this.changeBasicStatusOicrs(
          resultId,
          status,
          comment,
          currentStatus,
        );
      default:
        throw new ConflictException('Invalid status');
    }
  }

  private changeBasicStatusOicrs(
    resultId: number,
    status: ResultStatusEnum,
    comment: string,
    currentStatus: ResultStatusEnum,
  ) {
    const OICR_STATUS_TRANSITIONS = {
      [ResultStatusEnum.SCIENCE_EDITION]: {
        allowedFrom: [ResultStatusEnum.DRAFT, ResultStatusEnum.KM_CURATION],
        message:
          'Only results in draft or KM Curation status can be changed to Science Edition status',
      },
      [ResultStatusEnum.KM_CURATION]: {
        allowedFrom: [
          ResultStatusEnum.SCIENCE_EDITION,
          ResultStatusEnum.PUBLISHED,
        ],
        message:
          'Only results in Science Edition status can be changed to KM Curation status',
      },
      [ResultStatusEnum.PUBLISHED]: {
        allowedFrom: [ResultStatusEnum.KM_CURATION],
        message:
          'Only results in KM Curation status can be changed to Published status',
      },
    };

    const transition = OICR_STATUS_TRANSITIONS[status];

    if (transition && !transition.allowedFrom.includes(currentStatus)) {
      throw new ConflictException(transition.message);
    }
    return this.createHistoryObject(resultId, currentStatus, status, comment);
  }

  private prevalidateFunctions(status: ResultStatusEnum) {
    if (this._resultsUtil.indicatorId === IndicatorsEnum.OICR) {
      this.prevalidateOicrFunctions(status);
    }
  }

  private prevalidateOicrFunctions(status: ResultStatusEnum): void {
    if (
      [
        ResultStatusEnum.OICR_APPROVED,
        ResultStatusEnum.POSTPONE,
        ResultStatusEnum.REJECTED,
      ].includes(status)
    ) {
      validateRoles(this.currentUserUtil, SecRolesEnum.GENERAL_ADMIN);
    }
  }

  private async otherFunctions(
    status: ResultStatusEnum,
    currentStatus: ResultStatusEnum,
    body?: OptionalBody,
  ): Promise<Result> {
    if (status === ResultStatusEnum.APPROVED) {
      return this.greenCheckRepository.createSnapshot(
        this._resultsUtil.resultCode,
        this._resultsUtil.nullReportYearId,
      );
    }

    if (
      this._resultsUtil.indicatorId === IndicatorsEnum.OICR &&
      status === ResultStatusEnum.DRAFT &&
      currentStatus === ResultStatusEnum.REQUESTED
    ) {
      await this.resultOicrService.review(this._resultsUtil.resultId, body);
    }

    return null;
  }

  private changeToOicrApproved(
    resultId: number,
    status: ResultStatusEnum,
    comment: string,
    currentStatus: ResultStatusEnum,
  ) {
    if (currentStatus !== ResultStatusEnum.REQUESTED)
      throw new ConflictException(
        'Only OIRC in requested status can be OICR approved',
      );

    return this.createHistoryObject(resultId, currentStatus, status, comment);
  }

  private changeToReviewOicrStatus(
    resultId: number,
    status: ResultStatusEnum,
    comment: string,
    currentStatus: ResultStatusEnum,
  ) {
    if (
      ![
        ResultStatusEnum.REQUESTED,
        ResultStatusEnum.SCIENCE_EDITION,
        ResultStatusEnum.DRAFT,
      ].includes(currentStatus)
    )
      throw new ConflictException(
        `Only OIRC in requested status can be ${ResultStatusNameEnum[status]} status`,
      );

    return this.createHistoryObject(resultId, currentStatus, status, comment);
  }

  private changeToReviewStatus(
    resultId: number,
    status: ResultStatusEnum,
    comment: string,
    currentStatus: ResultStatusEnum,
  ): SubmissionHistory {
    const isOicr = this._resultsUtil.indicatorId === IndicatorsEnum.OICR;

    const allowedStatuses = isOicr
      ? [
          ResultStatusEnum.DRAFT,
          ResultStatusEnum.REQUESTED,
          ResultStatusEnum.POSTPONE,
        ]
      : [ResultStatusEnum.SUBMITTED];

    if (!allowedStatuses.includes(currentStatus)) {
      throw new ConflictException(
        `Only results in submitted or requested status can be ${ResultStatusNameEnum[status]}`,
      );
    }

    if (
      [ResultStatusEnum.REVISED, ResultStatusEnum.REJECTED].includes(status) &&
      isEmpty(comment)
    )
      throw new BadRequestException(
        `The comment is required when changing to ${ResultStatusNameEnum[status]} status`,
      );

    return this.createHistoryObject(resultId, currentStatus, status, comment);
  }

  private changeToSubmittedUnsubmitted(
    resultId: number,
    status: ResultStatusEnum,
    comment: string,
    currentStatus: ResultStatusEnum,
    body?: OptionalBody,
  ): SubmissionHistory {
    if (
      this._resultsUtil.indicatorId === IndicatorsEnum.OICR &&
      status === ResultStatusEnum.DRAFT &&
      currentStatus === ResultStatusEnum.REQUESTED
    ) {
      const valid = validObject(body, [
        'mel_regional_expert',
        'oicr_internal_code',
      ]);
      if (!valid.isValid) {
        throw new BadRequestException(
          `The following fields are required to move OICR to draft status: ${valid.invalidFields.join(
            ', ',
          )}`,
        );
      }
    }
    if (
      ![
        ResultStatusEnum.SUBMITTED,
        ResultStatusEnum.DRAFT,
        ResultStatusEnum.REVISED,
        ResultStatusEnum.REQUESTED,
        ResultStatusEnum.SCIENCE_EDITION,
        ResultStatusEnum.POSTPONE,
        ResultStatusEnum.REJECTED,
      ].includes(currentStatus) &&
      ![ResultStatusEnum.SUBMITTED, ResultStatusEnum.DRAFT].includes(status)
    ) {
      const errorMessage = `Only results in ${ResultStatusNameEnum[ResultStatusEnum.DRAFT]}, ${ResultStatusNameEnum[ResultStatusEnum.SCIENCE_EDITION]}, ${ResultStatusNameEnum[ResultStatusEnum.REVISED]} or ${ResultStatusNameEnum[ResultStatusEnum.REQUESTED]} status can be changed to ${ResultStatusNameEnum[status]} status`;
      throw new ConflictException(errorMessage);
    }

    if (currentStatus === ResultStatusEnum.SUBMITTED && isEmpty(comment))
      throw new BadRequestException(
        'The comment is required when changing from submitted to draft',
      );
    return this.createHistoryObject(resultId, currentStatus, status, comment);
  }

  private createHistoryObject(
    resultId: number,
    from?: ResultStatusEnum,
    to?: ResultStatusEnum,
    comment?: string,
  ): SubmissionHistory {
    const history = new SubmissionHistory();
    history.submission_comment = comment;
    history.from_status_id = from;
    history.to_status_id = to;
    history.result_id = resultId;
    history.created_by = this.currentUserUtil.user_id;
    return history;
  }

  async saveHistory(resultId: number, historyObject: SubmissionHistory) {
    return this.dataSource.transaction(async (manager) => {
      await manager.getRepository(Result).update(resultId, {
        result_status_id: historyObject.to_status_id,
        ...this.currentUserUtil.audit(SetAutitEnum.UPDATE),
      });

      const response = await manager.getRepository(SubmissionHistory).insert({
        result_id: resultId,
        submission_comment: historyObject.submission_comment,
        from_status_id: historyObject.from_status_id,
        to_status_id: historyObject.to_status_id,
        ...this.currentUserUtil.audit(SetAutitEnum.NEW),
      });

      const history = await manager.getRepository(SubmissionHistory).findOne({
        where: {
          submission_history_id:
            response.identifiers?.[0].submission_history_id,
        },
      });

      return history;
    });
  }

  async prepareDataToEmail(
    resultId: number,
    toStatusId: ResultStatusEnum,
    fromStatusId: ResultStatusEnum,
    templateName: TemplateEnum,
    history?: SubmissionHistory,
  ) {
    let prepareData = null;
    if (this._resultsUtil.indicatorId === IndicatorsEnum.OICR) {
      prepareData = this.greenCheckRepository
        .oircData(resultId, {
          url: `${this.appConfig.ARI_CLIENT_HOST}/result/${this._resultsUtil.resultCode}/general-information`,
          historyId: history?.submission_history_id,
          is_requested: fromStatusId === ResultStatusEnum.REQUESTED,
        })
        .then(async (data) => {
          const template = await this.templateService._getTemplate(
            templateName,
            data,
          );

          return { template, data };
        });
    } else if (toStatusId === ResultStatusEnum.SUBMITTED) {
      prepareData = this.greenCheckRepository
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
            support_email: this.appConfig.ARI_SUPPORT_EMAIL,
            content_support_email: this.appConfig.ARI_CONTENT_SUPPORT_EMAIL,
            system_name: this.appConfig.ARI_MIS,
            rev_email:
              data.contributor_id == this.currentUserUtil.user_id
                ? data.contributor_email
                : [
                    data.contributor_email,
                    this.currentUserUtil.user.email,
                  ].join(', '),
            url: `${this.appConfig.ARI_CLIENT_HOST}/result/${data.result_id}/general-information`,
            indicator: data.indicator,
          };
          const template = await this.templateService._getTemplate(
            TemplateEnum.SUBMITTED_RESULT,
            newData,
          );
          return { template, data: newData };
        });
    } else {
      prepareData = this.greenCheckRepository
        .getDataForReviseResult(resultId, toStatusId, fromStatusId)
        .then(async (data) => {
          data['url'] =
            `${this.appConfig.ARI_CLIENT_HOST}/result/${this._resultsUtil.resultCode}/general-information`;
          const template = await this.templateService._getTemplate(
            templateName,
            data,
          );
          return { template, data };
        });
    }
    return prepareData;
  }

  private exitPrepareEmail(
    status: ResultStatusEnum,
    fromStatus?: ResultStatusEnum,
  ) {
    if (
      [
        ResultStatusEnum.SCIENCE_EDITION,
        ResultStatusEnum.KM_CURATION,
        ResultStatusEnum.PUBLISHED,
      ].includes(status) ||
      (status === ResultStatusEnum.DRAFT &&
        fromStatus === ResultStatusEnum.SCIENCE_EDITION)
    ) {
      return true;
    }

    return false;
  }

  async prepareEmail(
    resultId: number,
    toStatusId: ResultStatusEnum,
    fromStatusId: ResultStatusEnum,
    body?: OptionalBody,
    history?: SubmissionHistory,
  ) {
    if (this.exitPrepareEmail(toStatusId, fromStatusId)) return;

    let metaData = null;
    if (this._resultsUtil.indicatorId === IndicatorsEnum.OICR) {
      metaData = {
        oicr_number: body?.oicr_internal_code,
      };
    }

    const emailConfig = getTemplateByStatus(
      toStatusId,
      this._resultsUtil,
      this.appConfig,
      metaData,
    );

    if (!emailConfig) return;

    const prepareData = this.prepareDataToEmail(
      resultId,
      toStatusId,
      fromStatusId,
      emailConfig.template,
      history,
    );

    await prepareData.then(({ data, template }) => {
      let toSend = '';
      let ccSend = '';
      const bccSend = this.appConfig.INTERNAL_EMAIL_LIST;
      if (this._resultsUtil.indicatorId === IndicatorsEnum.OICR) {
        const tempData = data as unknown as MessageOicrDto;
        const prepareCcEmail = [tempData.reviewed_by_email];
        if (toStatusId === ResultStatusEnum.OICR_APPROVED) {
          prepareCcEmail.push(tempData.mel_expert_email);
        }
        toSend = this.appConfig.SET_SAFE_EMAIL(
          tempData.requester_by_email,
          this.currentUserUtil.user.email,
        );
        ccSend = this.appConfig.SET_SAFE_EMAIL(
          prepareCcEmail.join(','),
          this.currentUserUtil.user.email,
        );
      } else {
        toSend =
          toStatusId === ResultStatusEnum.SUBMITTED
            ? this.currentUserUtil.user.email
            : data.sub_email;
        ccSend = data.rev_email;
      }
      this.messageMicroservice.sendEmail({
        to: toSend,
        cc: ccSend,
        bcc: bccSend,
        subject: emailConfig.subject,
        message: {
          socketFile: Buffer.from(template),
        },
      });
    });
  }

  async getSubmissionHistory(resultId: number): Promise<SubmissionHistory[]> {
    return this.greenCheckRepository.getSubmissionHistory(resultId);
  }

  async newReportingCycle(
    resultCode: number,
    newReportYear: number,
  ): Promise<Result> {
    const repoResult = this.dataSource.getRepository(Result);
    const tempResult = await repoResult.findOne({
      where: {
        result_official_code: resultCode,
        is_active: true,
        is_snapshot: false,
        result_status_id: ResultStatusEnum.APPROVED,
      },
    });

    if (!tempResult) {
      throw new BadRequestException(
        'Result not found or not approved for new reporting cycle',
      );
    }
    const result = await this.dataSource
      .getRepository(Result)
      .findOne({
        where: {
          result_official_code: resultCode,
          is_active: true,
          is_snapshot: false,
        },
      })
      .then(async (result) => {
        const newHistory = this.createHistoryObject(
          result.result_id,
          result.result_status_id,
          ResultStatusEnum.DRAFT,
          null,
        );
        await this.saveHistory(result.result_id, newHistory);
        return result;
      });

    await repoResult.update(
      {
        result_official_code: resultCode,
        is_snapshot: false,
        is_active: true,
      },
      {
        report_year_id: newReportYear,
        result_status_id: ResultStatusEnum.DRAFT,
        ...this.currentUserUtil.audit(SetAutitEnum.UPDATE),
      },
    );

    return {
      ...result,
      report_year_id: newReportYear,
      result_status_id: ResultStatusEnum.DRAFT,
    };
  }
}
