import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { ClarisaLever } from './entities/clarisa-lever.entity';
import { ControlListBaseService } from '../../../../shared/global-dto/clarisa-base-service';
import { CurrentUserUtil } from '../../../../shared/utils/current-user.util';
@Injectable()
export class ClarisaLeversService extends ControlListBaseService<
  ClarisaLever,
  Repository<ClarisaLever>
> {
  constructor(dataSource: DataSource, currentUser: CurrentUserUtil) {
    super(ClarisaLever, dataSource.getRepository(ClarisaLever), currentUser);
  }
}
