import { Injectable } from '@nestjs/common';
import { ControlListBaseService } from '../../shared/global-dto/clarisa-base-service';
import { NotableReferenceType } from './entities/notable-reference-type.entity';
import { DataSource, Repository } from 'typeorm';
import { CurrentUserUtil } from '../../shared/utils/current-user.util';

@Injectable()
export class NotableReferenceTypesService extends ControlListBaseService<
  NotableReferenceType,
  Repository<NotableReferenceType>
> {
  constructor(currentUser: CurrentUserUtil, dataSource: DataSource) {
    super(
      NotableReferenceType,
      dataSource.getRepository(NotableReferenceType),
      currentUser,
      'name',
    );
  }
}
