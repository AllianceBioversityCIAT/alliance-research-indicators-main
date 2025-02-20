import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { AuditableEntity } from '../../../shared/global-dto/auditable.entity';
import { Result } from '../../results/entities/result.entity';
import { ResultStatus } from '../../result-status/entities/result-status.entity';

@Entity('submission_history')
export class SubmissionHistory extends AuditableEntity {
  @PrimaryGeneratedColumn({
    type: 'bigint',
    name: 'submission_history_id',
  })
  public submission_history_id: number;

  @Column({
    type: 'bigint',
    name: 'result_id',
    nullable: false,
  })
  public result_id: number;

  @Column({
    type: 'bigint',
    name: 'submission_status_id',
    nullable: false,
  })
  public submission_status_id: number;

  @Column({
    type: 'text',
    name: 'submission_comment',
    nullable: true,
  })
  public submission_comment: string;

  @ManyToOne(() => Result, (result) => result.submission_histories)
  @JoinColumn({ name: 'result_id' })
  public result: Result;

  @ManyToOne(
    () => ResultStatus,
    (resultStatus) => resultStatus.submission_histories,
  )
  @JoinColumn({ name: 'submission_status_id' })
  public submission_status: ResultStatus;
}
