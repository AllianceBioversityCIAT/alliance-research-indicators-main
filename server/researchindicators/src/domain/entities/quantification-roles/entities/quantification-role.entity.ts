import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { AuditableEntity } from '../../../shared/global-dto/auditable.entity';
import { ResultQuantification } from '../../result-quantifications/entities/result-quantification.entity';

@Entity('quantification_roles')
export class QuantificationRole extends AuditableEntity {
  @PrimaryGeneratedColumn({
    type: 'bigint',
    name: 'id',
  })
  id: number;

  @Column({
    type: 'text',
    name: 'name',
  })
  name: string;

  @OneToMany(
    () => ResultQuantification,
    (resultQuantification) => resultQuantification.quantification_role,
  )
  result_quantifications?: ResultQuantification[];
}
