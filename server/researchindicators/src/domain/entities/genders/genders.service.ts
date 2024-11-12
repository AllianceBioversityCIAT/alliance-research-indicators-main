import { Injectable } from '@nestjs/common';
import { ControlListBaseService } from '../../shared/global-dto/clarisa-base-service';
import { DataSource, Repository } from 'typeorm';
import { Gender } from './entities/gender.entity';

@Injectable()
export class GendersService extends ControlListBaseService<
  Gender,
  Repository<Gender>
> {
  constructor(dataSource: DataSource) {
    super(Gender, dataSource.getRepository(Gender));
  }
}
