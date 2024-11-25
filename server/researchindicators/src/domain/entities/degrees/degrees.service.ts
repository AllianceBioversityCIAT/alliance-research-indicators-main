import { Injectable } from '@nestjs/common';
import { ControlListBaseService } from '../../shared/global-dto/clarisa-base-service';
import { DataSource, Repository } from 'typeorm';
import { Degree } from './entities/degree.entity';
import { CurrentUserUtil } from '../../shared/utils/current-user.util';

@Injectable()
export class DegreesService extends ControlListBaseService<
  Degree,
  Repository<Degree>
> {
  constructor(dataSource: DataSource, currentUser: CurrentUserUtil) {
    super(Degree, dataSource.getRepository(Degree), currentUser);
  }
}
