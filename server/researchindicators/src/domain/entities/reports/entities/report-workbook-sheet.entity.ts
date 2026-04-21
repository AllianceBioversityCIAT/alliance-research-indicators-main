import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('report_workbook_sheet')
export class ReportWorkbookSheet {
  @PrimaryGeneratedColumn({
    name: 'report_workbook_sheet_id',
    type: 'bigint',
  })
  report_workbook_sheet_id!: number;

  @Column({ name: 'workbook_key', type: 'varchar', length: 64 })
  workbook_key!: string;

  @Column({ name: 'sheet_key', type: 'varchar', length: 64 })
  sheet_key!: string;

  @Column({ name: 'sheet_name', type: 'varchar', length: 255 })
  sheet_name!: string;

  @Column({ name: 'sort_order', type: 'int', default: 0 })
  sort_order!: number;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  is_active!: boolean;
}
