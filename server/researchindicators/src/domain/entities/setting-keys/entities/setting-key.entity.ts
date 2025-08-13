import { Entity, OneToMany, PrimaryColumn } from 'typeorm';
import { AuditableEntity } from '../../../shared/global-dto/auditable.entity';
import { UserSetting } from '../../user-settings/entities/user-setting.entity';

@Entity('setting_keys')
export class SettingKey extends AuditableEntity {
  @PrimaryColumn({
    type: 'varchar',
    length: 50,
  })
  key!: string;

  @OneToMany(
    () => UserSetting,
    (userSetting) => userSetting.setting_parent_component,
  )
  userSettingsParentComponent!: UserSetting[];

  @OneToMany(() => UserSetting, (userSetting) => userSetting.setting_component)
  userSettingsComponent!: UserSetting[];

  @OneToMany(
    () => UserSetting,
    (userSetting) => userSetting.setting_especific_component,
  )
  userSettingsEspecificComponent!: UserSetting[];
}
