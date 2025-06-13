import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateResultInnovationDevDto } from './dto/create-result-innovation-dev.dto';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { ResultInnovationDev } from './entities/result-innovation-dev.entity';
import {
  CurrentUserUtil,
  SetAutitEnum,
} from '../../shared/utils/current-user.util';
import { selectManager } from '../../shared/utils/orm.util';

@Injectable()
export class ResultInnovationDevService {
  private readonly mainRepo: Repository<ResultInnovationDev>;
  constructor(
    dataSource: DataSource,
    private readonly _currentUser: CurrentUserUtil,
  ) {
    this.mainRepo = dataSource.getRepository(ResultInnovationDev);
  }

  async create(resultId: number, manager?: EntityManager) {
    const entityManager: Repository<ResultInnovationDev> = selectManager(
      manager,
      ResultInnovationDev,
      this.mainRepo,
    );

    return entityManager.save({
      result_id: resultId,
      ...this._currentUser.audit(SetAutitEnum.NEW),
    });
  }

  async update(
    resultId: number,
    createResultInnovationDevDto: CreateResultInnovationDevDto,
  ) {
    const existingResult = await this.mainRepo.findOne({
      where: { result_id: resultId, is_active: true },
    });

    if (!existingResult) {
      throw new NotFoundException(`Result with ID ${resultId} not found`);
    }

    return this.mainRepo.update(resultId, {
      innovation_nature_id: createResultInnovationDevDto?.innovation_nature_id,
      innovation_readiness_id:
        createResultInnovationDevDto?.innovation_readiness_id,
      innovation_type_id: createResultInnovationDevDto?.innovation_type_id,
      no_sex_age_disaggregation:
        createResultInnovationDevDto?.no_sex_age_disaggregation,
      short_title: createResultInnovationDevDto?.short_title,
      anticipated_users_id: createResultInnovationDevDto?.anticipated_users_id,
      ...this._currentUser.audit(SetAutitEnum.UPDATE),
    });
  }

  async findOne(id: number): Promise<CreateResultInnovationDevDto> {
    return this.mainRepo.findOne({
      where: { result_id: id, is_active: true },
    });
  }
}
