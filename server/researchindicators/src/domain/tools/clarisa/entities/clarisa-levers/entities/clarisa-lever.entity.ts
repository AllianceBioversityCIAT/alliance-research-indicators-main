import { Column, Entity, OneToMany } from 'typeorm';
import { ResultLever } from '../../../../../entities/result-levers/entities/result-lever.entity';
import { AuditableEntity } from '../../../../../shared/global-dto/auditable.entity';

@Entity('clarisa_levers')
export class ClarisaLever extends AuditableEntity {
  @Column('varchar', {
    name: 'code',
    length: 20,
    primary: true,
    nullable: false,
  })
  code!: string;

  @Column('text', {
    name: 'name',
    nullable: false,
  })
  name!: string;

  @Column('text', {
    name: 'definition',
    nullable: true,
  })
  definition?: string;

  @OneToMany(() => ResultLever, (resultLever) => resultLever.lever)
  result_levers!: ResultLever[];
}
