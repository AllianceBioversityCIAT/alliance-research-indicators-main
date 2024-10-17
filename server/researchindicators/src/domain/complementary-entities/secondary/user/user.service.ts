import { Injectable } from '@nestjs/common';
import { User } from './user.entity';
import { AlianceManagementApp } from '../../../tools/broker/aliance-management.app';

@Injectable()
export class UserService {
  constructor(private readonly alianceManagementApp: AlianceManagementApp) {}

  async find(ids: number[]): Promise<User[]> {
    return this.alianceManagementApp.sendToPattern<number[], User[]>(
      'user/find-by-id',
      ids,
    );
  }

  async existUsers(ids: number[]): Promise<number[]> {
    return this.find(ids).then((users) => {
      const existingUserIds = users.map((user) => user.sec_user_id);
      const nonExistingUserIds = ids.filter(
        (id) => !existingUserIds.includes(id),
      );
      return nonExistingUserIds;
    });
  }
}
