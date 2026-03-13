import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { AuditableEntity } from '../../../shared/global-dto/auditable.entity';

@Entity('submission_history_log')
export class SubmissionHistoryLog extends AuditableEntity {
  @PrimaryGeneratedColumn({
    type: 'bigint',
    name: 'id',
  })
  public id: number;

  @Column({
    type: 'bigint',
    name: 'submission_history_id',
    nullable: false,
  })
  public submission_history_id: number;

  @Column({
    type: 'timestamp',
    name: 'new_date',
    nullable: true,
  })
  public new_date: Date;

  @Column({
    type: 'timestamp',
    name: 'old_date',
    nullable: true,
  })
  public old_date: Date;
}
