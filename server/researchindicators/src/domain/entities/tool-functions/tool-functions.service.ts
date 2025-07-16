import { Injectable } from '@nestjs/common';
import { ControlListBaseService } from '../../shared/global-dto/clarisa-base-service';
import { ToolFunction } from './entities/tool-function.entity';
import { DataSource, Repository } from 'typeorm';
import { CurrentUserUtil } from '../../shared/utils/current-user.util';

@Injectable()
export class ToolFunctionsService extends ControlListBaseService<
  ToolFunction,
  Repository<ToolFunction>
> {
  constructor(dataSource: DataSource, currentUser: CurrentUserUtil) {
    super(ToolFunction, dataSource.getRepository(ToolFunction), currentUser);
  }
}
