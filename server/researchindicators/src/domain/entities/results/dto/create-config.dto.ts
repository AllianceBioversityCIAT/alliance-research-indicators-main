import { LeverRolesEnum } from '../../lever-roles/enum/lever-roles.enum';

export class CreateResultConfigDto {
  leverEnum?: LeverRolesEnum;
  notMap?: {
    lever?: boolean;
    sdg?: boolean;
  };
}
