import { Injectable } from '@nestjs/common';
import { ControlListBaseService } from '../../shared/global-dto/clarisa-base-service';
import { IntellectualPropertyOwner } from './entities/intellectual-property-owner.entity';
import { DataSource, Repository } from 'typeorm';
import { CurrentUserUtil } from '../../shared/utils/current-user.util';

@Injectable()
export class IntellectualPropertyOwnersService extends ControlListBaseService<
  IntellectualPropertyOwner,
  Repository<IntellectualPropertyOwner>
> {
  constructor(dataSource: DataSource, currentUser: CurrentUserUtil) {
    super(
      IntellectualPropertyOwner,
      dataSource.getRepository(IntellectualPropertyOwner),
      currentUser,
      'name',
    );
  }
}
