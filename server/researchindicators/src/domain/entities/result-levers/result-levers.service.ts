import { Injectable } from '@nestjs/common';
import { ResultLeversRepository } from './repositories/result-levers.repository';
import { EntityManager, Repository } from 'typeorm';
import { ResultLever } from './entities/result-lever.entity';
import { selectManager } from '../../shared/utils/orm.util';
import { BaseServiceSimple } from '../../shared/global-dto/base-service';
import {
  CurrentUserUtil,
  SetAutitEnum,
} from '../../shared/utils/current-user.util';
import { updateArray } from '../../shared/utils/array.util';
import { LeverRolesEnum } from '../lever-roles/enum/lever-roles.enum';
import { isEmpty } from '../../shared/utils/object.utils';

@Injectable()
export class ResultLeversService extends BaseServiceSimple<
  ResultLever,
  ResultLeversRepository
> {
  constructor(
    customRepo: ResultLeversRepository,
    currentUser: CurrentUserUtil,
  ) {
    super(ResultLever, customRepo, 'result_id', currentUser, 'lever_role_id');
  }

  async deleteAll(result_id: number, manager?: EntityManager) {
    const entityManager: Repository<ResultLever> = selectManager(
      manager,
      ResultLever,
      this.mainRepo,
    );

    const response = await entityManager.update(
      { result_id: result_id },
      { is_active: false, ...this.currentUser.audit(SetAutitEnum.UPDATE) },
    );

    return response;
  }

  protected lastRefactoredAfterSave<Enum>(
    data: Partial<ResultLever>[],
    roleId?: Enum, // eslint-disable-line @typescript-eslint/no-unused-vars
  ): Partial<ResultLever>[] {
    return data;
  }

  async comparerClientToServer(
    resultId: number,
    clientResultLevers: Partial<ResultLever>[],
    role: LeverRolesEnum,
    serverResultLevers?: Partial<ResultLever>[],
  ) {
    if (!isEmpty(serverResultLevers)) {
      serverResultLevers = await this.mainRepo.find({
        where: {
          result_id: resultId,
          is_active: true,
          lever_role_id: role,
        },
      });
    }

    return updateArray(
      clientResultLevers,
      serverResultLevers,
      'lever_id',
      {
        key: 'result_id',
        value: resultId,
      },
      'result_lever_id',
    );
  }
}
