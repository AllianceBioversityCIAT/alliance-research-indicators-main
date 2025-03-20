import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { AuditableEntity } from '../../../shared/global-dto/auditable.entity';
import { ResultLever } from '../../result-levers/entities/result-lever.entity';

@Entity('lever_roles')
export class LeverRole extends AuditableEntity {
  @PrimaryGeneratedColumn({
    name: 'lever_role_id',
    type: 'bigint',
  })
  lever_role_id!: number;

  @Column('text', {
    name: 'name',
    nullable: false,
  })
  name!: string;

  @OneToMany(() => ResultLever, (resultLever) => resultLever.lever_role)
  result_levers!: ResultLever[];
}
