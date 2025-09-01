import { Injectable } from '@nestjs/common';
import { BaseServiceSimple } from '../../shared/global-dto/base-service';
import { TempResultExternalOicr } from './entities/temp_result_external_oicr.entity';
import { DataSource, Repository } from 'typeorm';
import { CurrentUserUtil } from '../../shared/utils/current-user.util';

@Injectable()
export class TempExternalOicrsService extends BaseServiceSimple<
  TempResultExternalOicr,
  Repository<TempResultExternalOicr>
> {
  private readonly exteralRepo: Repository<TempResultExternalOicr>;
  constructor(dataSource: DataSource, currentUser: CurrentUserUtil) {
    super(
      TempResultExternalOicr,
      dataSource.getRepository(TempResultExternalOicr),
      'result_id',
      currentUser,
    );
    this.exteralRepo = dataSource.getRepository(TempResultExternalOicr);
  }

  async findExternalOicrs() {
    return this.exteralRepo.find({
      where: {
        is_active: true,
      },
    });
  }
}
