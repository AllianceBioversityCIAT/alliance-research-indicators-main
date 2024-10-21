import { Injectable } from '@nestjs/common';
import { ControlListBaseService } from '../../../../shared/global-dto/clarisa-base-service';
import { ClarisaInstitutionType } from './entities/clarisa-institution-type.entity';
import { DataSource, Repository } from 'typeorm';
@Injectable()
export class ClarisaInstitutionTypesService extends ControlListBaseService<
  ClarisaInstitutionType,
  Repository<ClarisaInstitutionType>
> {
  constructor(dataSource: DataSource) {
    super(
      ClarisaInstitutionType,
      dataSource.getRepository(ClarisaInstitutionType),
    );
  }
}
