import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { AllianceUserStaff } from '../entities/alliance-user-staff.entity';

@Injectable()
export class AllianceUserStaffRepository extends Repository<AllianceUserStaff> {
  constructor(dataSource: DataSource) {
    super(AllianceUserStaff, dataSource.createEntityManager());
  }
}
