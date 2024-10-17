import { Injectable, NotFoundException } from '@nestjs/common';
import { DataSource, In, Repository } from 'typeorm';
import { ResultUser } from './entities/result-user.entity';
import { UserRolesEnum } from '../user-roles/enum/user-roles.enum';
import { UserService } from '../../complementary-entities/secondary/user/user.service';
import { BaseServiceSimple } from '../../shared/global-dto/base-service';
@Injectable()
export class ResultUsersService extends BaseServiceSimple<
  ResultUser,
  Repository<ResultUser>
> {
  constructor(
    dataSource: DataSource,
    private readonly _userService: UserService,
  ) {
    super(
      ResultUser,
      dataSource.getRepository(ResultUser),
      'result_id',
      'user_role_id',
    );
  }

  protected async createCustomValidation(
    dataArray: Partial<ResultUser>[],
  ): Promise<void> {
    const userIds: number[] = dataArray.map((el) => el.user_id);
    const nonExistUser = await this._userService.existUsers(userIds);

    if (nonExistUser.length) {
      throw new NotFoundException(
        `Users are not registered (${nonExistUser.join(', ')})`,
      );
    }
  }

  async findUsersByRoleResult(
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
      const users = await this._userService.find(ids);

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
