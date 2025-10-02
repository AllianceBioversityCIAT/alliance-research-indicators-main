import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { AuditableEntity } from '../../../shared/global-dto/auditable.entity';
import { ResultInnovationToolFunction } from '../../result-innovation-tool-function/entities/result-innovation-tool-function.entity';

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
    () => ResultInnovationToolFunction,
    (resultInnovationToolFunction) => resultInnovationToolFunction.toolFunction,
  )
  result_innovation_tool_functions!: ResultInnovationToolFunction[];
}
