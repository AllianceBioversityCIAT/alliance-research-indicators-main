import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity('sync_staging_records')
export class SyncStagingRecordsEntity {
  @PrimaryColumn({
    type: 'varchar',
    length: 36,
    name: 'execution_code',
  })
  execution_code: string;

  @PrimaryColumn({
    type: 'bigint',
    name: 'code',
  })
  code: number;

  @PrimaryColumn({
    type: 'bigint',
    name: 'year',
  })
  year: number;

  @Column({
    type: 'json',
    name: 'data',
  })
  data: Record<string, any>;
}
