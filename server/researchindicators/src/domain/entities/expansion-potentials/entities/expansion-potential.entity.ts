import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { AuditableEntity } from '../../../shared/global-dto/auditable.entity';
import { ResultInnovationDev } from '../../result-innovation-dev/entities/result-innovation-dev.entity';

@Entity('expansion_potentials')
export class ExpansionPotential extends AuditableEntity {
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
    (resultInnovationDev) => resultInnovationDev.expansion_potential,
  )
  result_innovations_dev!: ResultInnovationDev[];
}
