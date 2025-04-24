import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';

@Injectable()
export class UserRepository {
  constructor(private readonly dataSource: DataSource) {}
}
