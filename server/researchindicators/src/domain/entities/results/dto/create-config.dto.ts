import { LeverRolesEnum } from '../../lever-roles/enum/lever-roles.enum';
import { ResultStatusEnum } from '../../result-status/enum/result-status.enum';

export class CreateResultConfigDto {
  result_status_id?: ResultStatusEnum;
  leverEnum?: LeverRolesEnum;
  notMap?: {
    lever?: boolean;
    sdg?: boolean;
  };
}
