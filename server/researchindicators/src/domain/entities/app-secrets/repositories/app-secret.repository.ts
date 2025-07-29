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
        su.email  
    from sec_users su
    where su.sec_user_id = ?
        and su.is_active = true`;

    return this.query(query, [userId]);
  }
}
