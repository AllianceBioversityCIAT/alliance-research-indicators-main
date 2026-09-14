import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SecUserEntity } from './entities/sec-user.entity';
import { ActiveUserResponseDto } from './dto/active-user-response.dto';
import { UserStatusEnum } from './enum/user-status.enum';
import { LoggerUtil } from '../../shared/utils/logger.util';

@Injectable()
export class UsersService {
  private readonly logger = new LoggerUtil({ name: 'UsersService' });

  constructor(
    @InjectRepository(SecUserEntity)
    private readonly secUserRepository: Repository<SecUserEntity>,
  ) {}

  /**
   * Returns active users (status_id = ACCEPTED AND is_active = TRUE) with an
   * optional name/email filter.
   *
   * "ACTIVE user" = sec_users.status_id = UserStatusEnum.ACCEPTED (1)
   *                 AND sec_users.is_active = TRUE.
   * Pending (2) and Rejected (3) users are excluded by the status_id predicate.
   *
   * When `search` is provided, rows are further narrowed to those where
   * first_name, last_name, or email contains the search term (LIKE %term%).
   * Results are ordered by last_name, first_name ascending.
   *
   * @param search  Optional name/email filter string
   * @returns       Array of ActiveUserResponseDto
   */
  async findActiveUsers(search?: string): Promise<ActiveUserResponseDto[]> {
    this.logger._log('findActiveUsers called', { method: 'findActiveUsers' });

    const qb = this.secUserRepository
      .createQueryBuilder('su')
      .select(['su.sec_user_id', 'su.first_name', 'su.last_name', 'su.email'])
      .where('su.status_id = :statusId', {
        statusId: UserStatusEnum.ACCEPTED,
      })
      .andWhere('su.is_active = TRUE')
      .orderBy('su.last_name', 'ASC')
      .addOrderBy('su.first_name', 'ASC');

    if (search && search.trim().length > 0) {
      const term = `%${search.trim()}%`;
      qb.andWhere(
        '(su.first_name LIKE :term OR su.last_name LIKE :term OR su.email LIKE :term)',
        { term },
      );
    }

    const rows = await qb.getMany();

    return rows.map((row) => ({
      sec_user_id: Number(row.sec_user_id),
      first_name: row.first_name ?? null,
      last_name: row.last_name ?? null,
      email: row.email,
    }));
  }
}
