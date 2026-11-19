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
import { FrameworkElement } from './framework-element.entity';
import { InstitutionalObjective } from './institutional-objective.entity';

/**
 * Link from an institutional objective to an indicator element (design
 * section 3.1, R-STF-009). Deleting the objective removes the link
 * (CASCADE). Deleting an element that still has a link is refused
 * (RESTRICT).
 */
@Entity('institutional_objective_elements')
@Index('uq_iob_element', ['institutional_objective_id', 'element_id'], {
  unique: true,
})
@Index('idx_iob_element_element', ['element_id'])
export class InstitutionalObjectiveElement extends AuditableEntity {
  @ApiProperty({ type: Number, name: 'id' })
  @PrimaryGeneratedColumn({ name: 'id', type: 'bigint' })
  id: number;

  @ApiProperty({ type: Number, name: 'institutional_objective_id' })
  @Column({ name: 'institutional_objective_id', type: 'bigint' })
  institutional_objective_id: number;

  @ApiProperty({ type: Number, name: 'element_id' })
  @Column({ name: 'element_id', type: 'bigint' })
  element_id: number;

  @ManyToOne(() => InstitutionalObjective, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({
    name: 'institutional_objective_id',
    foreignKeyConstraintName: 'FK_iob_elements_objective_id',
  })
  institutional_objective?: InstitutionalObjective;

  @ManyToOne(() => FrameworkElement, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({
    name: 'element_id',
    foreignKeyConstraintName: 'FK_iob_elements_element_id',
  })
  element?: FrameworkElement;
}
