import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { AuditableEntity } from '../../../shared/global-dto/auditable.entity';
import {
  SyncProcessEnum,
  SyncProcessStatusEnum,
} from '../enum/sync-process.enum';

@Entity('sync_process_logs')
export class SyncProcessLog extends AuditableEntity {
  @PrimaryGeneratedColumn({
    name: 'id',
    type: 'bigint',
  })
  id!: number;

  @Column({
    name: 'process_status',
    type: 'text',
    nullable: true,
  })
  process_status!: SyncProcessStatusEnum;

  @Column({
    name: 'process_name',
    type: 'text',
  })
  process_name!: SyncProcessEnum;

  @Column({
    name: 'created_records',
    type: 'bigint',
  })
  created_records!: number;

  @Column({
    name: 'updated_records',
    type: 'bigint',
  })
  updated_records!: number;

  @Column({
    name: 'total_records',
    type: 'bigint',
  })
  total_records!: number;

  @Column({
    name: 'success_records',
    type: 'bigint',
  })
  success_records!: number;

  @Column({
    name: 'error_records',
    type: 'bigint',
  })
  error_records!: number;
}
