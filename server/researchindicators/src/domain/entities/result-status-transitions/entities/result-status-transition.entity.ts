import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { AuditableEntity } from '../../../shared/global-dto/auditable.entity';
import { ResultStatus } from '../../result-status/entities/result-status.entity';

@Entity('result_status_transitions')
export class ResultStatusTransition extends AuditableEntity {
  @PrimaryGeneratedColumn({
    name: 'id',
    type: 'bigint',
  })
  id!: number;

  @Column('bigint', {
    name: 'from_status_id',
    nullable: false,
  })
  from_status_id!: number;

  @Column('bigint', {
    name: 'to_status_id',
    nullable: false,
  })
  to_status_id!: number;

  @ManyToOne(
    () => ResultStatus,
    (resultStatus) => resultStatus.toResultStatusTransitions,
  )
  @JoinColumn({ name: 'to_status_id' })
  to_status!: ResultStatus;

  @ManyToOne(
    () => ResultStatus,
    (resultStatus) => resultStatus.fromResultStatusTransitions,
  )
  @JoinColumn({ name: 'from_status_id' })
  from_status!: ResultStatus;
}
