import { Injectable } from '@nestjs/common';
import { CreateResultInnovationDevDto } from './dto/create-result-innovation-dev.dto';
import { DataSource, Repository } from 'typeorm';
import { ResultInnovationDev } from './entities/result-innovation-dev.entity';
import {
  CurrentUserUtil,
  SetAutitEnum,
} from '../../shared/utils/current-user.util';

@Injectable()
export class ResultInnovationDevService {
  private readonly mainRepo: Repository<ResultInnovationDev>;
  constructor(
    dataSource: DataSource,
    private readonly _currentUser: CurrentUserUtil,
  ) {
    this.mainRepo = dataSource.getRepository(ResultInnovationDev);
  }

  async update(
    resultId: number,
    createResultInnovationDevDto: CreateResultInnovationDevDto,
  ) {
    return this.mainRepo.update(resultId, {
      ...createResultInnovationDevDto,
      ...this._currentUser.audit(SetAutitEnum.UPDATE),
    });
  }

  async findOne(id: number): Promise<CreateResultInnovationDevDto> {
    return this.mainRepo.findOne({
      where: { result_id: id, is_active: true },
    });
  }
}
