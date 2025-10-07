import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { AuditableEntity } from '../../../shared/global-dto/auditable.entity';
import { AllianceUserStaffGroup } from '../../alliance-user-staff-groups/entities/alliance-user-staff-group.entity';

@Entity('staff_groups')
export class StaffGroup extends AuditableEntity {
  @PrimaryGeneratedColumn({
    type: 'bigint',
    name: 'id',
  })
  id: number;

  @Column('text', {
    name: 'name',
    nullable: false,
  })
  name: string;

  @OneToMany(
    () => AllianceUserStaffGroup,
    (allianceUserStaffGroup) => allianceUserStaffGroup.staffGroup,
  )
  allianceUserStaffGroups!: AllianceUserStaffGroup[];
}
