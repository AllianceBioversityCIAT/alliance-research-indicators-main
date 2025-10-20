import { TemplateEnum } from '../../../shared/auxiliar/template/enum/template.enum';
import { AppConfig } from '../../../shared/utils/app-config.util';
import { ResultsUtil } from '../../../shared/utils/results.util';
import { IndicatorsEnum } from '../../indicators/enum/indicators.enum';

export enum ResultStatusEnum {
  EDITING = 1,
  SUBMITTED = 2,
  ACCEPTED = 3,
  DRAFT = 4,
  REVISED = 5,
  APPROVED = 6,
  REJECTED = 7,
  DELETED = 8,
  REQUESTED = 9,
  OICR_APPROVED = 10,
  POSTPONE = 11,
}

export const ResultStatusNameEnum = {
  1: 'Editing',
  2: 'Submitted',
  3: 'Accepted',
  4: 'Draft',
  5: 'Revised',
  6: 'Approved',
  7: 'Rejected',
  8: 'Deleted',
  9: 'Requested',
  10: 'OICR Approved',
  11: 'OICR Postpone',
};

export const getTemplateByStatus = (
  status: ResultStatusEnum,
  result: ResultsUtil,
  appConfig: AppConfig,
  otherData?: Record<string, unknown>,
) => {
  const oicrNumber =
    typeof otherData?.oicr_number == 'string' ? otherData.oicr_number : '';
  status =
    result.indicatorId === IndicatorsEnum.OICR &&
    status === ResultStatusEnum.DRAFT
      ? ResultStatusEnum.OICR_APPROVED
      : status;
  if (
    ![
      ResultStatusEnum.REVISED,
      ResultStatusEnum.REJECTED,
      ResultStatusEnum.APPROVED,
      ResultStatusEnum.POSTPONE,
      ResultStatusEnum.OICR_APPROVED,
    ].includes(status)
  )
    return null;
  const templates: { [key in ResultStatusEnum]?: TemplateStatus } = {
    [ResultStatusEnum.REVISED]: {
      template: TemplateEnum.REVISE_RESULT,
      subject: `[${appConfig.ARI_MIS}] Action Required: Revision Requested for Result ${result.resultCode}`,
    },
    [ResultStatusEnum.REJECTED]: rejectedSubject(result, appConfig),
    [ResultStatusEnum.APPROVED]: {
      template: TemplateEnum.APPROVAL_RESULT,
      subject: `[${appConfig.ARI_MIS}] Result ${result.resultCode} has been approved`,
    },
    [ResultStatusEnum.SUBMITTED]: {
      template: TemplateEnum.SUBMITTED_RESULT,
      subject: `[${appConfig.ARI_MIS}] Result ${result.resultCode}, Action Required: Review New Result Submission`,
    },
    [ResultStatusEnum.OICR_APPROVED]: {
      template: TemplateEnum.OICR_APPROVED,
      subject: `[${appConfig.ARI_MIS}] - Your OICR ${oicrNumber} has been approved`,
    },
    [ResultStatusEnum.POSTPONE]: {
      template: TemplateEnum.OICR_POSTPONE,
      subject: `[${appConfig.ARI_MIS}] - Your OICR request has been postponed`,
    },
  };

  return templates[status];
};

const rejectedSubject = (
  result: ResultsUtil,
  appConfig: AppConfig,
): TemplateStatus => {
  if (result.indicatorId === IndicatorsEnum.OICR) {
    return {
      template: TemplateEnum.OICR_REJECTED,
      subject: `[${appConfig.ARI_MIS}] - Your OICR request has been rejected`,
    };
  }
  return {
    template: TemplateEnum.REJECTED_RESULT,
    subject: `[${appConfig.ARI_MIS}] Result ${result.resultCode} Rejected`,
  };
};

export type TemplateStatus = {
  template: TemplateEnum;
  subject?: string;
};
