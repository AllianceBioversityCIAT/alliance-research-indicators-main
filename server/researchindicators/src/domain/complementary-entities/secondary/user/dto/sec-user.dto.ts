import { AuditableEntity } from '../../../../shared/global-dto/auditable.entity';

export class SecUser extends AuditableEntity {
  sec_user_id: number;
  first_name?: string;
  last_name?: string;
  email: string;
  status_id: number;
  last_login_at?: Date;
  carnet?: string;
}
