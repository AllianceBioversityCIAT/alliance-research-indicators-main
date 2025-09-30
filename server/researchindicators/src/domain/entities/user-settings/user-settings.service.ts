import { BadRequestException, Injectable } from '@nestjs/common';
import { DataSource, FindOptionsWhere, Repository } from 'typeorm';
import { UserSetting } from './entities/user-setting.entity';
import { CurrentUserUtil } from '../../shared/utils/current-user.util';
import { LoggerUtil } from '../../shared/utils/logger.util';
import { isEmpty } from '../../shared/utils/object.utils';

@Injectable()
export class UserSettingsService {
  private readonly mainRepo: Repository<UserSetting>;
  private readonly logger: LoggerUtil = new LoggerUtil({
    name: UserSettingsService.name,
  });

  constructor(
    private readonly dataSource: DataSource,
    private readonly currentUser: CurrentUserUtil,
  ) {
    this.mainRepo = this.dataSource.getRepository(UserSetting);
  }

  async updateSettings(
    parent_component: string,
    component: string,
    data: Record<string, string>,
  ) {
    if (isEmpty(component))
      throw new BadRequestException('Component is required');

    const userId = this.currentUser.user_id;
    const response = {};
    for (const key in data) {
      const specific_component = key;
      const value = data[key];
      const existingSetting = await this.mainRepo.findOne({
        where: {
          user_id: userId,
          parent_component,
          component,
          specific_component,
        },
      });

      if (existingSetting) {
        existingSetting.value = value;
        await this.mainRepo.save(existingSetting);
      } else {
        const newSetting = this.mainRepo.create({
          user_id: userId,
          parent_component,
          component,
          specific_component,
          value,
        });
        this.mainRepo.save(newSetting).catch(() => {
          this.logger._error(
            `Failed to save new user setting: ${JSON.stringify(newSetting)}`,
          );
        });
        response[specific_component] = value;
      }
    }
    return response;
  }

  async findByUserIdAndComponent(parent_component: string, component: string) {
    const userId = this.currentUser.user_id;
    const where: FindOptionsWhere<UserSetting> = {
      user_id: userId,
      parent_component,
    };

    if (!isEmpty(component)) where.component = component;

    const settings = await this.mainRepo.find({
      where,
    });

    const response: Record<string, string> = {};
    for (const setting of settings) {
      response[setting.specific_component] = setting.value;
    }
    return response;
  }
}
