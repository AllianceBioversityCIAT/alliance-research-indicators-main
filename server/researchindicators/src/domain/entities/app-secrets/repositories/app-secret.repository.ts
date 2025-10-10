import { Injectable } from '@nestjs/common';
import { EntityManager, Repository } from 'typeorm';
import { AppSecret } from '../entities/app-secret.entity';
import { CurrentUserUtil } from '../../../shared/utils/current-user.util';
import { User } from '../../../complementary-entities/secondary/user/user.entity';
import { AppConfig } from '../../../shared/utils/app-config.util';

@Injectable()
export class AppSecretRepository extends Repository<AppSecret> {
  constructor(
    private readonly entityManager: EntityManager,
    private readonly appConfig: AppConfig,
    private readonly currentUserUtil: CurrentUserUtil,
  ) {
    super(AppSecret, entityManager);
  }

  async getUserValidation(userId: number): Promise<User> {
    const query = `
     select 
          su.sec_user_id, 
          su.first_name, 
          su.last_name, 
          su.email,
          JSON_ARRAYAGG(sur.role_id) as roles
      from sec_users su
      left join sec_user_roles sur on sur.user_id = su.sec_user_id 
                                  and sur.is_active = true
      where su.sec_user_id = ?
          and su.is_active = true
      group by su.sec_user_id
      limit 1`;

    return this.query(query, [userId]).then((res) => res?.[0] ?? null);
  }
}
