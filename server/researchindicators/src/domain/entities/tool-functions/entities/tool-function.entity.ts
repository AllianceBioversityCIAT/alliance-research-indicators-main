import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { AuditableEntity } from '../../../shared/global-dto/auditable.entity';
import { ResultInnovationDev } from '../../result-innovation-dev/entities/result-innovation-dev.entity';

@Entity('tool_functions')
export class ToolFunction extends AuditableEntity {
  @PrimaryGeneratedColumn({
    name: 'id',
    type: 'bigint',
  })
  id!: number;

  @Column('text', {
    name: 'name',
    nullable: false,
  })
  name!: string;

  @OneToMany(
    () => ResultInnovationDev,
    (resultInnovationDev) => resultInnovationDev.tool_function,
  )
  result_innovations_dev!: ResultInnovationDev[];
}
