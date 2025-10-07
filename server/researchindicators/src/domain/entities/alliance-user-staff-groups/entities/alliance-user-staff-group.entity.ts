import {
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryColumn,
} from 'typeorm';
import { AuditableEntity } from '../../../shared/global-dto/auditable.entity';
import { AllianceUserStaff } from '../../alliance-user-staff/entities/alliance-user-staff.entity';
import { StaffGroup } from '../../staff-groups/entities/staff-group.entity';
import { ResultOicr } from '../../result-oicr/entities/result-oicr.entity';

@Entity('alliance_user_staff_groups')
@Index('idx_ausg_carnet', ['carnet', 'staff_group_id'], { unique: true })
export class AllianceUserStaffGroup extends AuditableEntity {
  @PrimaryColumn({
    type: 'varchar',
    length: 10,
    name: 'carnet',
  })
  carnet: string;

  @PrimaryColumn({
    type: 'bigint',
    name: 'staff_group_id',
  })
  staff_group_id: number;

  @ManyToOne(
    () => AllianceUserStaff,
    (allianceUserStaff) => allianceUserStaff.allianceUserStaffGroups,
  )
  @JoinColumn({ name: 'carnet' })
  allianceUserStaff: AllianceUserStaff;

  @ManyToOne(
    () => StaffGroup,
    (staffGroup) => staffGroup.allianceUserStaffGroups,
  )
  @JoinColumn({ name: 'staff_group_id' })
  staffGroup: StaffGroup;

  @OneToMany(() => ResultOicr, (ro) => ro.mel_regional_expert)
  staffGroupOicr: ResultOicr[];
}
