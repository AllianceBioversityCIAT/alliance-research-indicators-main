import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { AuditableEntity } from '../../../shared/global-dto/auditable.entity';
import { AppSecretHostList } from '../../app-secret-host-list/entities/app-secret-host-list.entity';

@Entity('app_secrets')
export class AppSecret extends AuditableEntity {
  @PrimaryGeneratedColumn({
    name: 'app_secret_id',
    type: 'bigint',
  })
  app_secret_id: string;

  @Column({
    name: 'app_secret_key',
    type: 'text',
  })
  app_secret_key: string;

  @Column({
    name: 'app_secret_uuid',
    type: 'text',
  })
  app_secret_uuid: string;

  @Column({
    name: 'app_secret_description',
    type: 'text',
    nullable: true,
  })
  app_secret_description: string;

  @Column({
    name: 'responsible_user_id',
    type: 'bigint',
  })
  responsible_user_id!: number;

  @OneToMany(
    () => AppSecretHostList,
    (appSecretHostList) => appSecretHostList.appSecret,
  )
  app_secret_host_list: AppSecretHostList[];
}
