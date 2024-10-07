import { Injectable, NotFoundException } from '@nestjs/common';
import { DataSource, EntityManager, In, Not, Repository } from 'typeorm';
import { ResultUser } from './entities/result-user.entity';
import { selectManager } from '../../shared/utils/orm.util';
import { filterPersistKey, updateArray } from '../../shared/utils/array.util';
import { UserRolesEnum } from '../user-roles/enum/user-roles.enum';
import { UserService } from '../../complementary-entities/secondary/user/user.service';
@Injectable()
export class ResultUsersService {
  private readonly mainRepo: Repository<ResultUser>;

  constructor(
    private dataSource: DataSource,
    private readonly _userService: UserService,
  ) {
    this.mainRepo = dataSource.getRepository(ResultUser);
  }

  async create(
    result_id: number,
    users: Partial<ResultUser> | Partial<ResultUser>[],
    user_role_id: UserRolesEnum,
    manager?: EntityManager,
  ) {
    const entityManager: Repository<ResultUser> = selectManager(
      manager,
      ResultUser,
      this.mainRepo,
    );

    const userArray = Array.isArray(users) ? users : [users];
    const resulrUserIds: number[] = userArray.map(
      (data) => data.result_user_id,
    );
    const existData = await this.mainRepo.find({
      where: {
        result_id: result_id,
        user_role_id: user_role_id,
        result_user_id: In(resulrUserIds),
      },
    });

    const userIds: number[] = userArray.map((el) => el.user_id);
    const nonExistUser = await this._userService.existUsers(userIds);

    if (nonExistUser.length) {
      throw new NotFoundException(
        `Users are not registered (${nonExistUser.join(', ')})`,
      );
    }

    const formatDataUser: Partial<ResultUser>[] = userArray.map((data) => ({
      result_user_id: data?.result_user_id,
      user_role_id: user_role_id,
      user_id: data.user_id,
    }));

    const updateResultUser = updateArray<ResultUser>(
      formatDataUser,
      existData,
      'user_id',
      {
        key: 'result_id',
        value: result_id,
      },
      'result_user_id',
    );

    const persistId = filterPersistKey<ResultUser>(
      'result_user_id',
      updateResultUser,
    );

    await entityManager.update(
      {
        result_id: result_id,
        result_user_id: Not(In(persistId)),
        user_role_id: user_role_id,
      },
      {
        is_active: false,
      },
    );

    const response = (await entityManager.save(updateResultUser)).filter(
      (data) => data.is_active === true,
    );

    return response;
  }

  async findUsersByRoleRoesult(
    role: UserRolesEnum,
    resultId: number,
    userRelation: boolean = false,
  ) {
    const resultUsers = await this.mainRepo.find({
      where: {
        user_role_id: role,
        result_id: resultId,
        is_active: true,
      },
    });

    let responseResultUsers = resultUsers;
    if (userRelation) {
      const ids = resultUsers.map((el) => el.user_id);
      const users = await this._userService.find({
        where: {
          is_active: true,
          sec_user_id: In(ids),
        },
      });

      responseResultUsers = resultUsers.map((el) => {
        const user = users.find((user) => user.sec_user_id === el.user_id);
        return {
          ...el,
          user,
        };
      });
    }

    return responseResultUsers;
  }
}
