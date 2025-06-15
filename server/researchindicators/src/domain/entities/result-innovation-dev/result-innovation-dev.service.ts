import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateResultInnovationDevDto } from './dto/create-result-innovation-dev.dto';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { ResultInnovationDev } from './entities/result-innovation-dev.entity';
import {
  CurrentUserUtil,
  SetAutitEnum,
} from '../../shared/utils/current-user.util';
import { selectManager } from '../../shared/utils/orm.util';
import { ResultActorsService } from '../result-actors/result-actors.service';
import { ActorRolesEnum } from '../actor-roles/enum/actor-roles.enum';
import { filterByUniqueKeyWithPriority } from '../../shared/utils/array.util';
import { CreateResultActorDto } from '../result-actors/dto/create-result-actor.dto';
import { ResultInstitutionTypesService } from '../result-institution-types/result-institution-types.service';
import { InstitutionTypeRoleEnum } from '../institution-type-roles/enum/institution-type-role.enum';

@Injectable()
export class ResultInnovationDevService {
  private readonly mainRepo: Repository<ResultInnovationDev>;
  constructor(
    private readonly dataSource: DataSource,
    private readonly _currentUser: CurrentUserUtil,
    private readonly _resultActorsService: ResultActorsService,
    private readonly _resultInstitutionTypesService: ResultInstitutionTypesService,
  ) {
    this.mainRepo = this.dataSource.getRepository(ResultInnovationDev);
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

    return this.dataSource.transaction(async (manager) => {
      manager.getRepository(this.mainRepo.target).update(resultId, {
        innovation_nature_id:
          createResultInnovationDevDto?.innovation_nature_id,
        innovation_readiness_id:
          createResultInnovationDevDto?.innovation_readiness_id,
        innovation_type_id: createResultInnovationDevDto?.innovation_type_id,
        no_sex_age_disaggregation:
          createResultInnovationDevDto?.no_sex_age_disaggregation,
        short_title: createResultInnovationDevDto?.short_title,
        anticipated_users_id:
          createResultInnovationDevDto?.anticipated_users_id,
        expected_outcome: createResultInnovationDevDto?.expected_outcome,
        intended_beneficiaries_description:
          createResultInnovationDevDto?.intended_beneficiaries_description,
        ...this._currentUser.audit(SetAutitEnum.UPDATE),
      });

      const filterActors = filterByUniqueKeyWithPriority<CreateResultActorDto>(
        createResultInnovationDevDto?.actors,
        'actor_type_id',
        'result_actors_id',
      );

      await this._resultActorsService.create<ActorRolesEnum>(
        resultId,
        filterActors,
        'actor_type_id',
        ActorRolesEnum.INNOVATION_DEV,
        manager,
        [
          'sex_age_disaggregation_not_apply',
          'men_youth',
          'men_not_youth',
          'women_youth',
          'women_not_youth',
        ],
      );

      await this._resultInstitutionTypesService.create(
        resultId,
        createResultInnovationDevDto?.institution_types,
        'institution_type_id',
        InstitutionTypeRoleEnum.INNOVATION_DEV,
        manager,
      );

      return this.mainRepo.findOne({
        where: { result_id: resultId, is_active: true },
      });
    });
  }

  async findOne(id: number): Promise<CreateResultInnovationDevDto> {
    return this.mainRepo.findOne({
      where: { result_id: id, is_active: true },
    });
  }
}
