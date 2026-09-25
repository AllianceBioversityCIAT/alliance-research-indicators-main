import { Column, Entity, PrimaryColumn } from 'typeorm';
import { AuditableEntity } from '../../../shared/global-dto/auditable.entity';

/**
 * TypeORM entity for sec_users.
 *
 * NOTE: sec_users.is_active is also declared on AuditableEntity, so it is
 * NOT re-declared here to avoid a duplicate column error.  AuditableEntity
 * maps it as the `is_active` boolean column, which matches the DB schema.
 *
 * sec_users does not use TypeORM auto-generated PKs (the PK is a plain
 * bigint without AUTO_INCREMENT in some codepaths) — declared as @PrimaryColumn.
 */
@Entity('sec_users')
export class SecUserEntity extends AuditableEntity {
  @PrimaryColumn({
    type: 'bigint',
    name: 'sec_user_id',
  })
  sec_user_id!: number;

  @Column({
    type: 'varchar',
    name: 'first_name',
    length: 60,
    nullable: true,
  })
  first_name!: string | null;

  @Column({
    type: 'varchar',
    name: 'last_name',
    length: 60,
    nullable: true,
  })
  last_name!: string | null;

  @Column({
    type: 'varchar',
    name: 'email',
    length: 150,
    nullable: false,
  })
  email!: string;

  @Column({
    type: 'bigint',
    name: 'status_id',
    nullable: true,
  })
  status_id!: number;

  @Column({
    type: 'varchar',
    name: 'carnet',
    length: 10,
    nullable: true,
  })
  carnet!: string | null;

  @Column({
    type: 'timestamp',
    name: 'last_login_at',
    nullable: true,
  })
  last_login_at!: Date | null;
}
