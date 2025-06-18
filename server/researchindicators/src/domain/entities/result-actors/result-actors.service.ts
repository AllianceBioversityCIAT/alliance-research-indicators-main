import { Injectable } from '@nestjs/common';
import { BaseServiceSimple } from '../../shared/global-dto/base-service';
import { ResultActor } from './entities/result-actor.entity';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { CurrentUserUtil } from '../../shared/utils/current-user.util';
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

    if (other.length > 0)
      await this.create(
        resultId,
        other,
        'actor_type_custom_name',
        ActorRolesEnum.INNOVATION_DEV,
        manager,
        ['actor_type_id', ...othersProperties],
      );

    if (actors.length > 0)
      await this.create<ActorRolesEnum>(
        resultId,
        actors,
        'actor_type_id',
        ActorRolesEnum.INNOVATION_DEV,
        manager,
        othersProperties,
      );
  }
}
