import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ResultUsersService } from '../../entities/result-users/result-users.service';
import {
  DEFAULT_RESULT_OWNER_TYPES,
  ResultOwnerType,
} from '../decorators/result-owner.decorator';
import { SecRolesEnum } from '../enum/sec_role.enum';
import { ResultsUtil } from '../utils/results.util';
import { ResultOwnerGuard } from './result-owner.guard';

describe('ResultOwnerGuard', () => {
  let guard: ResultOwnerGuard;
  let reflector: jest.Mocked<Reflector>;
  let resultsUtil: jest.Mocked<ResultsUtil>;
  let resultUsersService: jest.Mocked<ResultUsersService>;

  beforeEach(() => {
    reflector = {
      getAllAndOverride: jest.fn(),
    } as any;
    resultsUtil = {
      setup: jest.fn().mockResolvedValue(undefined),
      resultId: 100,
    } as any;
    resultUsersService = {
      isUserOnResult: jest.fn(),
    } as any;
    guard = new ResultOwnerGuard(reflector, resultsUtil, resultUsersService);
  });

  const createExecutionContext = (user: any): ExecutionContext => {
    return {
      switchToHttp: () => ({
        getRequest: () => ({ user }),
      }),
      getHandler: jest.fn(),
      getClass: jest.fn(),
    } as any;
  };

  it('should deny when no user is present', async () => {
    await expect(guard.canActivate(createExecutionContext(null))).resolves.toBe(
      false,
    );
    expect(resultsUtil.setup).not.toHaveBeenCalled();
  });

  it('should allow system admins without ownership lookup', async () => {
    await expect(
      guard.canActivate(
        createExecutionContext({
          sec_user_id: 1,
          roles: [SecRolesEnum.SYSTEM_ADMIN],
        }),
      ),
    ).resolves.toBe(true);
    expect(resultUsersService.isUserOnResult).not.toHaveBeenCalled();
  });

  it('should allow center admins without ownership lookup', async () => {
    await expect(
      guard.canActivate(
        createExecutionContext({
          sec_user_id: 1,
          roles: [SecRolesEnum.CENTER_ADMIN],
        }),
      ),
    ).resolves.toBe(true);
    expect(resultUsersService.isUserOnResult).not.toHaveBeenCalled();
  });

  it('should allow a contributor when ownership matches', async () => {
    resultUsersService.isUserOnResult.mockResolvedValue(true);

    await expect(
      guard.canActivate(
        createExecutionContext({
          sec_user_id: 10,
          roles: [SecRolesEnum.CONTRIBUTOR],
        }),
      ),
    ).resolves.toBe(true);

    expect(resultsUtil.setup).toHaveBeenCalled();
    expect(resultUsersService.isUserOnResult).toHaveBeenCalledWith(
      100,
      10,
      DEFAULT_RESULT_OWNER_TYPES,
    );
  });

  it('should deny a contributor when ownership does not match', async () => {
    resultUsersService.isUserOnResult.mockResolvedValue(false);

    await expect(
      guard.canActivate(
        createExecutionContext({
          sec_user_id: 10,
          roles: [SecRolesEnum.CONTRIBUTOR],
        }),
      ),
    ).resolves.toBe(false);
  });

  it('should use owner types from @ResultOwner metadata when present', async () => {
    reflector.getAllAndOverride.mockReturnValue([ResultOwnerType.CONTACT]);
    resultUsersService.isUserOnResult.mockResolvedValue(true);

    await guard.canActivate(
      createExecutionContext({
        sec_user_id: 10,
        roles: [SecRolesEnum.CONTRIBUTOR],
      }),
    );

    expect(resultUsersService.isUserOnResult).toHaveBeenCalledWith(100, 10, [
      ResultOwnerType.CONTACT,
    ]);
  });
});
