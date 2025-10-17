import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { AuditableEntity } from '../../../shared/global-dto/auditable.entity';
import { ResultUser } from '../../result-users/entities/result-user.entity';

@Entity('informative_roles')
export class InformativeRole extends AuditableEntity {
  @PrimaryGeneratedColumn({
    type: 'bigint',
    name: 'id',
  })
  id: number;

  @Column({
    type: 'text',
    name: 'name',
    nullable: false,
  })
  name: string;

  @ManyToOne(() => ResultUser, (resultUser) => resultUser.informativeRole)
  result_users!: ResultUser[];
}
