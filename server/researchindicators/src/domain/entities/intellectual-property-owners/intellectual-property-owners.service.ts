import { Injectable } from '@nestjs/common';
import { CreateIntellectualPropertyOwnerDto } from './dto/create-intellectual-property-owner.dto';
import { UpdateIntellectualPropertyOwnerDto } from './dto/update-intellectual-property-owner.dto';
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
