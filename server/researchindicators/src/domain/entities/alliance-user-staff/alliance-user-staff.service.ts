import { Injectable } from '@nestjs/common';
import { ControlListBaseService } from '../../shared/global-dto/clarisa-base-service';
import { DataSource, Repository } from 'typeorm';
import { AllianceUserStaff } from './entities/alliance-user-staff.entity';
import {
  cleanObject,
  isEmpty,
  validObject,
} from '../../shared/utils/object.utils';
import { PaginationDto } from '../../shared/global-dto/pagination.dto';

@Injectable()
export class AllianceUserStaffService extends ControlListBaseService<
  AllianceUserStaff,
  Repository<AllianceUserStaff>
> {
  constructor(dataSource: DataSource) {
    super(AllianceUserStaff, dataSource.getRepository(AllianceUserStaff));
  }

  async findWithFilters(pagination: PaginationDto, name?: string) {
    const paginationClean = cleanObject<PaginationDto>(pagination);
    const queryBuilder = this.mainRepo.createQueryBuilder('user');

    queryBuilder.where('user.is_active = :isActive', { isActive: true });

    if (!isEmpty(name)) {
      queryBuilder.andWhere(
        '(user.first_name LIKE :name OR user.last_name LIKE :name)',
        { name: `%${name}%` },
      );
    }

    const { isValid } = validObject(paginationClean, ['limit', 'page']);
    if (isValid) {
      const offset = (paginationClean.page - 1) * paginationClean.limit;
      queryBuilder.take(paginationClean.limit);
      queryBuilder.skip(offset);
    }

    return queryBuilder.getMany();
  }
}
