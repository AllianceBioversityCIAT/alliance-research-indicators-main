import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { AuditableEntity } from '../../../shared/global-dto/auditable.entity';
import { ResultUser } from '../../result-users/entities/result-user.entity';
import { ResultUserAi } from '../../result-users/entities/result-user-ai.entity';

@Entity('user_roles')
export class UserRole extends AuditableEntity {
  @PrimaryGeneratedColumn({
    name: 'user_role_id',
    type: 'bigint',
  })
  user_role_id!: number;

  @Column('text', {
    name: 'name',
    nullable: false,
  })
  name!: string;

  @OneToMany(() => ResultUser, (resultUser) => resultUser.role)
  result_users!: ResultUser[];

  @OneToMany(() => ResultUserAi, (resultUserAi) => resultUserAi.user_role)
  result_users_ai!: ResultUserAi[];
}
