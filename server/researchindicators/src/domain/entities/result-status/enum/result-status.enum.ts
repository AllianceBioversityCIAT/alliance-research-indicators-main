import { TemplateEnum } from '../../../shared/auxiliar/template/enum/template.enum';
import { AppConfig } from '../../../shared/utils/app-config.util';
import { ResultsUtil } from '../../../shared/utils/results.util';

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
};

export const getTemplateByStatus = (
  status: ResultStatusEnum,
  result: ResultsUtil,
  appConfig: AppConfig,
) => {
  const templates: { [key in ResultStatusEnum]?: TemplateStatus } = {
    [ResultStatusEnum.REVISED]: {
      template: TemplateEnum.REVISE_RESULT,
      subject: `[${appConfig.ARI_MIS}] Action Required: Revision Requested for Result ${result.resultCode}`,
    },
    [ResultStatusEnum.REJECTED]: {
      template: TemplateEnum.REJECTED_RESULT,
      subject: `[${appConfig.ARI_MIS}] Result ${result.resultCode} Rejected`,
    },
    [ResultStatusEnum.APPROVED]: {
      template: TemplateEnum.APPROVAL_RESULT,
      subject: `[${appConfig.ARI_MIS}] Result ${result.resultCode} has been approved`,
    },
    [ResultStatusEnum.SUBMITTED]: {
      template: TemplateEnum.SUBMITTED_RESULT,
      subject: `[${appConfig.ARI_MIS}] Result ${result.resultCode}, Action Required: Review New Result Submission`,
    },
  };

  return templates[status];
};

export type TemplateStatus = {
  template: TemplateEnum;
  subject?: string;
};
