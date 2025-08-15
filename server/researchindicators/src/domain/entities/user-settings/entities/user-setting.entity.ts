import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { AuditableEntity } from '../../../shared/global-dto/auditable.entity';
import { SettingKey } from '../../setting-keys/entities/setting-key.entity';

@Entity('user_settings')
export class UserSetting extends AuditableEntity {
  @PrimaryGeneratedColumn({
    name: 'id',
    type: 'bigint',
  })
  id!: number;

  @Column({
    name: 'user_id',
    type: 'bigint',
    nullable: false,
  })
  user_id!: number;

  @Column({
    name: 'parent_component',
    type: 'varchar',
    length: 50,
    nullable: false,
  })
  parent_component!: string;

  @Column({
    name: 'component',
    type: 'varchar',
    length: 50,
    nullable: false,
  })
  component!: string;

  @Column({
    name: 'especific_component',
    type: 'varchar',
    length: 50,
    nullable: false,
  })
  specific_component!: string;

  @Column({
    name: 'value',
    type: 'text',
    nullable: true,
  })
  value?: string;

  @ManyToOne(
    () => SettingKey,
    (settingKey) => settingKey.userSettingsParentComponent,
  )
  @JoinColumn({
    name: 'parent_component',
  })
  setting_parent_component!: SettingKey;

  @ManyToOne(() => SettingKey, (settingKey) => settingKey.userSettingsComponent)
  @JoinColumn({
    name: 'component',
  })
  setting_component!: SettingKey;

  @ManyToOne(
    () => SettingKey,
    (settingKey) => settingKey.userSettingsEspecificComponent,
  )
  @JoinColumn({
    name: 'especific_component',
  })
  setting_especific_component!: SettingKey;
}
