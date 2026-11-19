import { ApiProperty } from '@nestjs/swagger';
import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { AuditableEntity } from '../../../shared/global-dto/auditable.entity';
import { AllianceUserStaff } from '../../alliance-user-staff/entities/alliance-user-staff.entity';
import { FrameworkElement } from './framework-element.entity';

/**
 * One responsible of an indicator-level element (design section 3.1,
 * R-STF-004). Only the staff carnet is stored; name and email are joined
 * on read. The element foreign key is CASCADE; the staff foreign key is
 * RESTRICT. `position` is the chosen order.
 */
@Entity('framework_element_responsibles')
@Index('uq_framework_element_resp', ['element_id', 'staff_carnet'], {
  unique: true,
})
@Index('idx_framework_element_resp_staff', ['staff_carnet'])
export class FrameworkElementResponsible extends AuditableEntity {
  @ApiProperty({ type: Number, name: 'id' })
  @PrimaryGeneratedColumn({ name: 'id', type: 'bigint' })
  id: number;

  @ApiProperty({ type: Number, name: 'element_id' })
  @Column({ name: 'element_id', type: 'bigint' })
  element_id: number;

  @ApiProperty({ type: String, name: 'staff_carnet' })
  @Column({ name: 'staff_carnet', type: 'varchar', length: 10 })
  staff_carnet: string;

  @ApiProperty({ type: Number, name: 'position' })
  @Column({ name: 'position', type: 'smallint' })
  position: number;

  @ManyToOne(() => FrameworkElement, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({
    name: 'element_id',
    foreignKeyConstraintName: 'FK_framework_element_resp_element_id',
  })
  element?: FrameworkElement;

  @ManyToOne(() => AllianceUserStaff, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({
    name: 'staff_carnet',
    referencedColumnName: 'carnet',
    foreignKeyConstraintName: 'FK_framework_element_resp_staff_carnet',
  })
  staff?: AllianceUserStaff;
}
