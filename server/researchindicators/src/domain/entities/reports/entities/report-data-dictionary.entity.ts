import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('report_data_dictionary')
export class ReportDataDictionary {
  @PrimaryGeneratedColumn({
    name: 'report_data_dictionary_id',
    type: 'bigint',
  })
  report_data_dictionary_id!: number;

  @Column({ name: 'workbook_key', type: 'varchar', length: 64 })
  workbook_key!: string;

  @Column({ name: 'section', type: 'varchar', length: 512, nullable: true })
  section!: string | null;

  @Column({ name: 'field_label', type: 'text' })
  field_label!: string;

  @Column({ name: 'explanation', type: 'text', nullable: true })
  explanation!: string | null;

  @Column({
    name: 'section_fill_argb',
    type: 'varchar',
    length: 9,
    nullable: true,
  })
  section_fill_argb!: string | null;

  @Column({ name: 'sort_order', type: 'int' })
  sort_order!: number;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  is_active!: boolean;
}
