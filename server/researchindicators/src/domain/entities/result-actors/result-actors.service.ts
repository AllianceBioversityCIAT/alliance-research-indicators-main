import { Injectable } from '@nestjs/common';
import { BaseServiceSimple } from '../../shared/global-dto/base-service';
import { ResultActor } from './entities/result-actor.entity';
import {
  DataSource,
  EntityManager,
  FindOptionsWhere,
  Repository,
} from 'typeorm';
import {
  CurrentUserUtil,
  SetAutitEnum,
} from '../../shared/utils/current-user.util';
import { CreateResultActorDto } from './dto/create-result-actor.dto';
import { ClarisaActorTypesEnum } from '../../tools/clarisa/entities/clarisa-actor-types/enum/clarisa-actor-types.enum';
import { ActorRolesEnum } from '../actor-roles/enum/actor-roles.enum';

@Injectable()
export class ResultActorsService extends BaseServiceSimple<
  ResultActor,
  Repository<ResultActor>
> {
  constructor(
    private readonly dataSource: DataSource,
    currentUser: CurrentUserUtil,
  ) {
    super(
      ResultActor,
      dataSource.getRepository(ResultActor),
      'result_id',
      currentUser,
      'actor_role_id',
    );
  }

  private formatData(actors: CreateResultActorDto[]) {
    return {
      actors: actors.filter(
        (actor) => actor.actor_type_id !== ClarisaActorTypesEnum.OTHER,
      ),
      other: actors.filter(
        (actor) => actor.actor_type_id === ClarisaActorTypesEnum.OTHER,
      ),
    };
  }

  async saveInnovationDev(
    resultId: number,
    data: CreateResultActorDto[],
    manager: EntityManager,
  ) {
    const { other, actors } = this.formatData(data);
    const othersProperties: (keyof ResultActor)[] = [
      'sex_age_disaggregation_not_apply',
      'men_youth',
      'men_not_youth',
      'women_youth',
      'women_not_youth',
    ];
    let notDeleteIds = [];
    if (other.length > 0) {
      const tempData = await this.create(
        resultId,
        other,
        'actor_type_custom_name',
        ActorRolesEnum.INNOVATION_DEV,
        manager,
        ['actor_type_id', ...othersProperties],
      );
      notDeleteIds = tempData.map((x) => x.result_actors_id);
    }

    if (actors.length > 0)
      await this.create<ActorRolesEnum>(
        resultId,
        actors,
        'actor_type_id',
        ActorRolesEnum.INNOVATION_DEV,
        manager,
        othersProperties,
        undefined,
        notDeleteIds,
      );
  }

  async customSaveInnovationDev(
    resultId: number,
    data: CreateResultActorDto[],
    manager: EntityManager,
  ) {
    const tempRepo = manager.getRepository(ResultActor);
    const dataToSave: Partial<ResultActor>[] = [];
    for (const institution of data) {
      if (institution?.result_actors_id) {
        dataToSave.push({
          is_active: true,
          result_actors_id: institution?.result_actors_id,
          actor_type_id: institution?.actor_type_id,
          men_youth: institution?.men_youth,
          men_not_youth: institution?.men_not_youth,
          women_youth: institution?.women_youth,
          women_not_youth: institution?.women_not_youth,
          actor_type_custom_name: institution?.actor_type_custom_name,
          sex_age_disaggregation_not_apply:
            institution?.sex_age_disaggregation_not_apply,
          actor_role_id: ActorRolesEnum.INNOVATION_DEV,
          ...this.currentUser.audit(SetAutitEnum.UPDATE),
        });
      } else {
        const where = this.constructWhereClause(institution, resultId);
        const existData = await tempRepo.findOne({
          where,
        });

        const dataTemp: Partial<ResultActor> = {
          result_id: resultId,
          is_active: true,
          actor_type_id: institution?.actor_type_id,
          men_youth: institution?.men_youth,
          men_not_youth: institution?.men_not_youth,
          women_youth: institution?.women_youth,
          women_not_youth: institution?.women_not_youth,
          actor_type_custom_name: institution?.actor_type_custom_name,
          sex_age_disaggregation_not_apply:
            institution?.sex_age_disaggregation_not_apply,
          actor_role_id: ActorRolesEnum.INNOVATION_DEV,
          ...this.currentUser.audit(SetAutitEnum.NEW),
        };

        if (existData) {
          dataTemp['result_actors_id'] = existData.result_actors_id;
        }

        dataToSave.push(dataTemp);
      }
    }
    await tempRepo.update(
      {
        result_id: resultId,
        is_active: true,
        actor_role_id: ActorRolesEnum.INNOVATION_DEV,
      },
      { is_active: false },
    );
    return tempRepo.save(dataToSave);
  }

  private constructWhereClause(data: CreateResultActorDto, resultId: number) {
    const where: FindOptionsWhere<ResultActor> = {
      result_id: resultId,
      actor_role_id: ActorRolesEnum.INNOVATION_DEV,
    };
    if (data.actor_type_id == ClarisaActorTypesEnum.OTHER) {
      where['actor_type_custom_name'] = data.actor_type_custom_name;
      where['actor_type_id'] = ClarisaActorTypesEnum.OTHER;
    } else {
      where['actor_type_id'] = data?.actor_type_id;
    }

    return where;
  }
}
