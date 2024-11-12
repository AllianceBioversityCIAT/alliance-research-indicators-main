import { Injectable } from '@nestjs/common';
import { ControlListBaseService } from '../../shared/global-dto/clarisa-base-service';
import { DataSource, Repository } from 'typeorm';
import { Degree } from './entities/degree.entity';

@Injectable()
export class DegreesService extends ControlListBaseService<
  Degree,
  Repository<Degree>
> {
  constructor(dataSource: DataSource) {
    super(Degree, dataSource.getRepository(Degree));
  }
}
