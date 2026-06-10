import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { AuditableEntity } from '../../../shared/global-dto/auditable.entity';
import { BulkUploadResults } from './bulk-upload-results.entity';

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

  @OneToMany(
    () => BulkUploadResults,
    (bulkUploadResult) => bulkUploadResult.bulkUploadProcess,
  )
  bulkUploadResults!: BulkUploadResults[];
}
