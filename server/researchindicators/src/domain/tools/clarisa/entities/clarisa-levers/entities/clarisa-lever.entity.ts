import { Column, Entity, OneToMany, PrimaryColumn } from 'typeorm';
import { ResultLever } from '../../../../../entities/result-levers/entities/result-lever.entity';
import { AuditableEntity } from '../../../../../shared/global-dto/auditable.entity';

@Entity('clarisa_levers')
export class ClarisaLever extends AuditableEntity {
  @PrimaryColumn('bigint', {
    name: 'id',
    nullable: false,
  })
  id!: number;

  @Column('text', {
    name: 'short_name',
    nullable: false,
  })
  short_name!: string;

  @Column('text', {
    name: 'full_name',
    nullable: true,
  })
  full_name?: string;

  @Column('text', {
    name: 'other_names',
    nullable: true,
  })
  other_names?: string;

  @OneToMany(() => ResultLever, (resultLever) => resultLever.lever)
  result_levers!: ResultLever[];
}
