import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ResultUsersService } from '../../entities/result-users/result-users.service';
import { SecRolesEnum } from '../enum/sec_role.enum';
import {
  DEFAULT_RESULT_OWNER_TYPES,
  RESULT_OWNER_KEY,
  ResultOwnerType,
} from '../decorators/result-owner.decorator';
import { ResultsUtil } from '../utils/results.util';

@Injectable()
export class ResultOwnerGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly resultsUtil: ResultsUtil,
    private readonly resultUsersService: ResultUsersService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user?.sec_user_id) return false;

    if (
      user.roles?.includes(SecRolesEnum.SYSTEM_ADMIN) ||
      user.roles?.includes(SecRolesEnum.CENTER_ADMIN)
    ) {
      return true;
    }

    await this.resultsUtil.setup();

    const ownerTypes =
      this.reflector.getAllAndOverride<ResultOwnerType[]>(RESULT_OWNER_KEY, [
        context.getHandler(),
        context.getClass(),
      ]) ?? DEFAULT_RESULT_OWNER_TYPES;

    return this.resultUsersService.isUserOnResult(
      this.resultsUtil.resultId,
      user.sec_user_id,
      ownerTypes,
    );
  }
}
