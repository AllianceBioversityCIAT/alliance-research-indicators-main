import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, FindManyOptions, FindOneOptions } from 'typeorm';
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
}
