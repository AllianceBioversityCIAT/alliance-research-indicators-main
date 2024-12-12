import { Column, Entity, OneToMany, PrimaryColumn } from 'typeorm';
import { AuditableEntity } from '../../../shared/global-dto/auditable.entity';
import { ResultUser } from '../../result-users/entities/result-user.entity';

@Entity('alliance_user_staff')
export class AllianceUserStaff extends AuditableEntity {
  @PrimaryColumn({
    name: 'carnet',
    type: 'varchar',
    length: 10,
  })
  carnet!: string;

  @Column('text', {
    name: 'first_name',
    nullable: false,
  })
  first_name!: string;

  @Column('text', {
    name: 'last_name',
    nullable: false,
  })
  last_name!: string;

  @Column('text', {
    name: 'email',
    nullable: true,
  })
  email!: string;

  @Column('text', {
    name: 'status',
    nullable: true,
  })
  status?: string;

  @Column('text', {
    name: 'center',
    nullable: true,
  })
  center?: string;

  @OneToMany(() => ResultUser, (result_user) => result_user.user)
  result_users!: ResultUser[];
}
