import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { AuditableEntity } from '../../../shared/global-dto/auditable.entity';
import { BulkUploadResults } from './bulk-upload-results.entity';
import { NotificationStatus } from '../notifications/enum/notification-status.enum';

@Entity('bulk_upload_processes')
export class BulkUploadProcesses extends AuditableEntity {
  @PrimaryGeneratedColumn({
    name: 'id',
    type: 'bigint',
  })
  id!: number;

  @Column({
    name: 'file_name',
    type: 'text',
  })
  file_name!: string;

  @Column({
    name: 'ai_interaction_id',
    type: 'text',
  })
  ai_interaction_id!: string;

  @Column({
    name: 'total_results',
    type: 'bigint',
    nullable: true,
  })
  total_results?: number | null;

  @Column({
    name: 'total_capdev_results',
    type: 'bigint',
    nullable: true,
  })
  total_capdev_results?: number | null;

  @Column({
    name: 'total_participants',
    type: 'bigint',
    nullable: true,
  })
  total_participants?: number | null;

  @Column({
    name: 'total_female_participants',
    type: 'bigint',
    nullable: true,
  })
  total_female_participants?: number | null;

  @Column({
    name: 'activity_start_date',
    type: 'timestamp',
    nullable: true,
  })
  activity_start_date?: Date | null;

  @Column({
    name: 'activity_end_date',
    type: 'timestamp',
    nullable: true,
  })
  activity_end_date?: Date | null;

  @Column({
    name: 'countries',
    type: 'json',
    nullable: true,
  })
  countries?: string[] | null;

  @Column({
    name: 'notification_sent_at',
    type: 'timestamp',
    nullable: true,
  })
  notification_sent_at?: Date | null;

  @Column({
    name: 'notification_status',
    type: 'varchar',
    length: 20,
    nullable: true,
  })
  notification_status?: NotificationStatus | null;

  @OneToMany(
    () => BulkUploadResults,
    (bulkUploadResult) => bulkUploadResult.bulkUploadProcess,
  )
  bulkUploadResults!: BulkUploadResults[];
}
