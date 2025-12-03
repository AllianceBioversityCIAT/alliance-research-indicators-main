import { Column, Entity, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';
import { AuditableEntity } from '../../../shared/global-dto/auditable.entity';
import { Result } from '../../results/entities/result.entity';

@Entity('result_knowledge_products')
export class ResultKnowledgeProduct extends AuditableEntity {
  @PrimaryColumn({
    type: 'bigint',
    name: 'result_id',
  })
  result_id: number;

  @Column({
    type: 'text',
    name: 'type',
    nullable: true,
  })
  type: string;

  @Column({
    type: 'text',
    name: 'citation',
    nullable: true,
  })
  citation: string;

  @Column({
    type: 'boolean',
    name: 'open_access',
    nullable: true,
  })
  open_access: boolean;

  @Column({
    type: 'text',
    name: 'publication_date',
    nullable: true,
  })
  publication_date: string;

  @ManyToOne(() => Result, (result) => result.knowledge_products)
  @JoinColumn({ name: 'result_id' })
  result: Result;
}
