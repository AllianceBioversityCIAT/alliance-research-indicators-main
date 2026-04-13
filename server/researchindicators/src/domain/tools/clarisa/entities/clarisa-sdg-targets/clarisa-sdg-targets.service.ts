import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { CurrentUserUtil } from '../../../../shared/utils/current-user.util';

@Injectable()
export class ClarisaSdgTargetsService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly currentUser: CurrentUserUtil,
  ) {}
}
