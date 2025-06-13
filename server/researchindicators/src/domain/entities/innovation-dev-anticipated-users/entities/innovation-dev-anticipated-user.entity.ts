import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { AuditableEntity } from '../../../shared/global-dto/auditable.entity';
import { ResultInnovationDev } from '../../result-innovation-dev/entities/result-innovation-dev.entity';

@Entity('innovation_dev_anticipated_users')
export class InnovationDevAnticipatedUser extends AuditableEntity {
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
    (resultInnovationDev) => resultInnovationDev.anticipatedUsers,
  )
  result_innovation_dev?: ResultInnovationDev[];
}
