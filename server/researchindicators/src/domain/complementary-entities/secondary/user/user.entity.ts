import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { AuditableEntity } from '../../../shared/global-dto/auditable.entity';

@Entity('sec_users')
export class User extends AuditableEntity {
  @PrimaryGeneratedColumn({
    type: 'bigint',
    name: 'sec_user_id',
  })
  sec_user_id: number;

  @Column({
    type: 'varchar',
    name: 'first_name',
    length: 60,
  })
  first_name: string;

  @Column({
    type: 'varchar',
    name: 'last_name',
    length: 60,
  })
  last_name: string;

  @Column({
    type: 'varchar',
    name: 'email',
    length: 150,
  })
  email: string;
}
