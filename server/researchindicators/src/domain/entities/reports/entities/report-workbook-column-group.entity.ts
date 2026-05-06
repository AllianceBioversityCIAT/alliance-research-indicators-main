import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('report_workbook_column_group')
export class ReportWorkbookColumnGroup {
  @PrimaryGeneratedColumn({
    name: 'report_workbook_column_group_id',
    type: 'bigint',
  })
  report_workbook_column_group_id!: number;

  @Column({ name: 'workbook_key', type: 'varchar', length: 64 })
  workbook_key!: string;

  @Column({ name: 'sheet_key', type: 'varchar', length: 64 })
  sheet_key!: string;

  @Column({ name: 'sort_order', type: 'int' })
  sort_order!: number;

  @Column({ name: 'from_col', type: 'int' })
  from_col!: number;

  @Column({ name: 'to_col', type: 'int' })
  to_col!: number;

  @Column({ name: 'label', type: 'varchar', length: 255 })
  label!: string;

  @Column({ name: 'fill_argb', type: 'varchar', length: 9 })
  fill_argb!: string;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  is_active!: boolean;
}
