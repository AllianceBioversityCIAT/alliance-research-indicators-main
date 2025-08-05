import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { AuditableEntity } from '../../../shared/global-dto/auditable.entity';
import { AppSecret } from '../../app-secrets/entities/app-secret.entity';

@Entity('app_secret_host_list')
export class AppSecretHostList extends AuditableEntity {
  @PrimaryGeneratedColumn({
    name: 'app_secret_host_list_id',
    type: 'bigint',
  })
  app_secret_host_list_id: number;

  @Column({
    name: 'app_secret_id',
    type: 'bigint',
  })
  app_secret_id: string;

  @Column({
    name: 'host',
    type: 'text',
  })
  host: string;

  @ManyToOne(() => AppSecret, (appSecret) => appSecret.app_secret_host_list)
  @JoinColumn({ name: 'app_secret_id' })
  appSecret: AppSecret;
}
