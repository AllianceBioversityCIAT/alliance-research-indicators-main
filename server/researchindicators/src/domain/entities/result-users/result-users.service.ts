import { Injectable } from '@nestjs/common';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { ResultUser } from './entities/result-user.entity';
import { UserRolesEnum } from '../user-roles/enum/user-roles.enum';
import { UserService } from '../../complementary-entities/secondary/user/user.service';
import { BaseServiceSimple } from '../../shared/global-dto/base-service';
import { CurrentUserUtil } from '../../shared/utils/current-user.util';
import { ResultUserAi } from './entities/result-user-ai.entity';
import { isEmpty } from 'lodash';
import { selectManager } from '../../shared/utils/orm.util';
import { AiRawUser } from '../results/dto/result-ai.dto';
@Injectable()
export class ResultUsersService extends BaseServiceSimple<
  ResultUser,
  Repository<ResultUser>
> {
  constructor(
    private readonly dataSource: DataSource,
    private readonly _userService: UserService,
    currentUser: CurrentUserUtil,
  ) {
    super(
      ResultUser,
      dataSource.getRepository(ResultUser),
      'result_id',
      currentUser,
      'user_role_id',
    );
  }

  filterInstitutionsAi(
    users: AiRawUser[],
    user_role: UserRolesEnum,
  ): {
    acept: Partial<ResultUser>[];
    pending: Partial<ResultUserAi>[];
  } {
    if (isEmpty(users)) return null;
    const aceptUsers: Partial<ResultUser>[] = [];
    const pendingUsers: Partial<ResultUserAi>[] = [];
    for (const user of users) {
      if (parseInt(user.similarity_score) >= 90)
        aceptUsers.push({
          user_id: user.code,
        });
      else
        pendingUsers.push({
          user_code: user.code,
          user_role_id: user_role,
          user_name: user.name,
          score: parseInt(user.similarity_score),
        });
    }

    return { acept: aceptUsers, pending: pendingUsers };
  }

  async insertUserAi(
    resultId: number,
    users: ResultUserAi[],
    user_role: UserRolesEnum,
    manager?: EntityManager,
  ) {
    if (isEmpty(users)) return null;
    const useManager = selectManager<ResultUserAi>(
      manager,
      ResultUserAi,
      this.dataSource.getRepository(ResultUserAi),
    );
    return useManager.save(
      users.map((user) => ({
        result_id: resultId,
        user_code: user.user_code,
        user_role_id: user_role,
        user_name: user.user_name,
        score: user.score,
      })),
    );
  }

  async findUsersByRoleResult(role: UserRolesEnum, resultId: number) {
    const resultUsers = await this.mainRepo.find({
      where: {
        user_role_id: role,
        result_id: resultId,
        is_active: true,
      },
      relations: {
        user: true,
      },
    });

    return resultUsers;
  }
}
