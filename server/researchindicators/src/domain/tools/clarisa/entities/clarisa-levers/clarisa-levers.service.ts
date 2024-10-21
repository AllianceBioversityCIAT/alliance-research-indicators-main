import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { ClarisaLever } from './entities/clarisa-lever.entity';
import { ControlListBaseService } from '../../../../shared/global-dto/clarisa-base-service';
@Injectable()
export class ClarisaLeversService extends ControlListBaseService<
  ClarisaLever,
  Repository<ClarisaLever>
> {
  constructor(dataSource: DataSource) {
    super(ClarisaLever, dataSource.getRepository(ClarisaLever));
  }
}
