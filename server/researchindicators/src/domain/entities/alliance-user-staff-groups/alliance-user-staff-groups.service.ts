import { Injectable } from '@nestjs/common';
import { ControlListBaseService } from '../../shared/global-dto/clarisa-base-service';
import { AllianceUserStaffGroup } from './entities/alliance-user-staff-group.entity';
import { DataSource, FindOptionsWhere, Repository } from 'typeorm';
import { CurrentUserUtil } from '../../shared/utils/current-user.util';
import { AllianceUserStaff } from '../alliance-user-staff/entities/alliance-user-staff.entity';

@Injectable()
export class AllianceUserStaffGroupsService extends ControlListBaseService<
  AllianceUserStaffGroup,
  Repository<AllianceUserStaffGroup>
> {
  constructor(dataSource: DataSource, currentUser: CurrentUserUtil) {
    super(
      AllianceUserStaffGroup,
      dataSource.getRepository(AllianceUserStaffGroup),
      currentUser,
    );
  }

  async findAllMap(groupId?: number): Promise<AllianceUserStaff[]> {
    const where: FindOptionsWhere<AllianceUserStaffGroup> = { is_active: true };
    if (groupId) where.staff_group_id = groupId;
    return this.mainRepo
      .find({
        where,
        relations: {
          allianceUserStaff: true,
        },
      })
      .then((res) => res.map((r) => r.allianceUserStaff));
  }
}
