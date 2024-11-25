import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { ResultUser } from './entities/result-user.entity';
import { UserRolesEnum } from '../user-roles/enum/user-roles.enum';
import { UserService } from '../../complementary-entities/secondary/user/user.service';
import { BaseServiceSimple } from '../../shared/global-dto/base-service';
import { CurrentUserUtil } from '../../shared/utils/current-user.util';
@Injectable()
export class ResultUsersService extends BaseServiceSimple<
  ResultUser,
  Repository<ResultUser>
> {
  constructor(
    dataSource: DataSource,
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
