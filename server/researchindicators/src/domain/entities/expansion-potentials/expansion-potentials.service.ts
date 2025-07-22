import { Injectable } from '@nestjs/common';
import { ControlListBaseService } from '../../shared/global-dto/clarisa-base-service';
import { ExpansionPotential } from './entities/expansion-potential.entity';
import { DataSource, Repository } from 'typeorm';
import { CurrentUserUtil } from '../../shared/utils/current-user.util';

@Injectable()
export class ExpansionPotentialsService extends ControlListBaseService<
  ExpansionPotential,
  Repository<ExpansionPotential>
> {
  constructor(dataSource: DataSource, currentUser: CurrentUserUtil) {
    super(
      ExpansionPotential,
      dataSource.getRepository(ExpansionPotential),
      currentUser,
    );
  }
}
