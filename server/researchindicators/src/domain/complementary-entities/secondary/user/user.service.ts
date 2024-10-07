import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, FindManyOptions, FindOneOptions, In } from 'typeorm';
import { User } from './user.entity';

@Injectable()
export class UserService {
  constructor(
    @InjectDataSource('secondary') private readonly dataSource: DataSource,
  ) {}

  async find(options: FindManyOptions<User>) {
    return this.dataSource.getRepository(User).find(options);
  }

  async findOne(options: FindOneOptions<User>) {
    return this.dataSource.getRepository(User).findOne(options);
  }

  async existUsers(ids: number[]): Promise<number[]> {
    return this.dataSource
      .getRepository(User)
      .find({
        where: {
          is_active: true,
          sec_user_id: In(ids),
        },
      })
      .then((users) => {
        const existingUserIds = users.map((user) => user.sec_user_id);
        const nonExistingUserIds = ids.filter(
          (id) => !existingUserIds.includes(id),
        );
        return nonExistingUserIds;
      });
  }
}
