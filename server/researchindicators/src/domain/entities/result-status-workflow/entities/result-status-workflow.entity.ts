import {
  Column,
  DeepPartial,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { AuditableEntity } from '../../../shared/global-dto/auditable.entity';
import { ResultStatus } from '../../result-status/entities/result-status.entity';
import { Indicator } from '../../indicators/entities/indicator.entity';
import { ConfigWorkflowDto } from '../config/config-workflow';

@Entity('result_status_workflow')
export class ResultStatusWorkflow extends AuditableEntity {
  @PrimaryGeneratedColumn({
    type: 'bigint',
    name: 'id',
  })
  id!: number;

  @Column({
    type: 'bigint',
    name: 'indicator_id',
    nullable: false,
  })
  indicator_id!: number;

  @Column({
    type: 'bigint',
    name: 'from_status_id',
    nullable: false,
  })
  from_status_id!: number;

  @Column({
    type: 'bigint',
    name: 'to_status_id',
    nullable: false,
  })
  to_status_id!: number;

  @Column({
    type: 'json',
    name: 'config',
    nullable: true,
  })
  config!: DeepPartial<ConfigWorkflowDto>;

  @ManyToOne(() => Indicator, (indicator) => indicator.result_status_workflows)
  @JoinColumn({ name: 'indicator_id' })
  indicator!: Indicator;

  @ManyToOne(
    () => ResultStatus,
    (resultStatus) => resultStatus.result_status_workflows_from,
  )
  @JoinColumn({ name: 'from_status_id' })
  from_status!: ResultStatus;

  @ManyToOne(
    () => ResultStatus,
    (resultStatus) => resultStatus.result_status_workflows_to,
  )
  @JoinColumn({ name: 'to_status_id' })
  to_status!: ResultStatus;
}
