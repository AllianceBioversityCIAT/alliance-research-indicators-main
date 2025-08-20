import { Injectable } from '@nestjs/common';
import { ControlListBaseService } from '../../shared/global-dto/clarisa-base-service';
import { Tag } from './entities/tag.entity';
import { DataSource, Repository } from 'typeorm';
import { CurrentUserUtil } from '../../shared/utils/current-user.util';

@Injectable()
export class TagsService extends ControlListBaseService<Tag, Repository<Tag>> {
  constructor(currentUser: CurrentUserUtil, dataSource: DataSource) {
    super(Tag, dataSource.getRepository(Tag), currentUser, 'name');
  }
}
