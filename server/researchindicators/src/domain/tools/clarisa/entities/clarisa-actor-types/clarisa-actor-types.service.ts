import { Injectable } from '@nestjs/common';
import { ControlListBaseService } from '../../../../shared/global-dto/clarisa-base-service';
import { ClarisaActorType } from './entities/clarisa-actor-type.entity';
import { DataSource, In, Repository } from 'typeorm';
import { CurrentUserUtil } from '../../../../shared/utils/current-user.util';

@Injectable()
export class ClarisaActorTypesService extends ControlListBaseService<
  ClarisaActorType,
  Repository<ClarisaActorType>
> {
  constructor(currentUser: CurrentUserUtil, dataSource: DataSource) {
    super(
      ClarisaActorType,
      dataSource.getRepository(ClarisaActorType),
      currentUser,
      'name',
    );
  }

  async validateActorTypes(actorTypeIds: number[]) {
    const existsActorsId = await this.mainRepo
      .find({
        where: {
          code: In(actorTypeIds),
        },
      })
      .then((actors) => actors.map((actor) => actor.code));

    return actorTypeIds?.filter((x) => !existsActorsId?.includes(x));
  }
}
