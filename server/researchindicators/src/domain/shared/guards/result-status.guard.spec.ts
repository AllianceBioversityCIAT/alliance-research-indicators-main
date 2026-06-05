import { BadRequestException, ExecutionContext } from '@nestjs/common';
import { ResultStatusGuard } from './result-status.guard';
import { ResultStatusEnum } from '../../entities/result-status/enum/result-status.enum';
import { SecRolesEnum } from '../enum/sec_role.enum';

describe('ResultStatusGuard', () => {
  const createGuard = (options: {
    result_status_id?: number;
    roles?: SecRolesEnum[];
    findOneResult?: { result_status_id: number } | null;
  }) => {
    const {
      result_status_id = ResultStatusEnum.DRAFT,
      roles = [],
      findOneResult,
    } = options;

    const findOne = jest
      .fn()
      .mockResolvedValue(findOneResult ?? { result_status_id });
    const getRepository = jest.fn().mockReturnValue({ findOne });
    const dataSource = { getRepository } as any;
    const resultsUtil = {
      setup: jest.fn().mockResolvedValue(undefined),
      resultId: 1,
    } as any;
    const currentUserUtil = {
      user: { roles },
    } as any;

    const guard = new ResultStatusGuard(
      dataSource,
      resultsUtil,
      currentUserUtil,
    );

    return { guard, findOne, resultsUtil, currentUserUtil };
  };

  const context = {} as ExecutionContext;

  describe('editable statuses', () => {
    const editableStatuses = [
      ResultStatusEnum.DRAFT,
      ResultStatusEnum.REVISED,
      ResultStatusEnum.SCIENCE_EDITION,
      ResultStatusEnum.KM_CURATION,
    ];

    it.each(editableStatuses)(
      'should allow editing when result status is %s',
      async (statusId) => {
        const { guard, findOne } = createGuard({ result_status_id: statusId });

        await expect(guard.canActivate(context)).resolves.toBe(true);
        expect(findOne).toHaveBeenCalled();
      },
    );
  });

  it('should reject non-editable status', async () => {
    const { guard } = createGuard({
      result_status_id: ResultStatusEnum.SUBMITTED,
    });

    await expect(guard.canActivate(context)).rejects.toThrow(
      BadRequestException,
    );
  });

  describe('role bypass', () => {
    const bypassRoles = [
      SecRolesEnum.SYSTEM_ADMIN,
      SecRolesEnum.TECHNICAL_SUPPORT,
      SecRolesEnum.CENTER_ADMIN,
    ];

    it.each(bypassRoles)(
      'should bypass status check for role %s',
      async (role) => {
        const { guard, findOne } = createGuard({
          result_status_id: ResultStatusEnum.SUBMITTED,
          roles: [role],
        });

        await expect(guard.canActivate(context)).resolves.toBe(true);
        expect(findOne).not.toHaveBeenCalled();
      },
    );

    it('should not bypass status check for non-privileged roles', async () => {
      const { guard, findOne } = createGuard({
        result_status_id: ResultStatusEnum.SUBMITTED,
        roles: [SecRolesEnum.CONTRIBUTOR],
      });

      await expect(guard.canActivate(context)).rejects.toThrow(
        BadRequestException,
      );
      expect(findOne).toHaveBeenCalled();
    });
  });

  it('should call resultsUtil.setup before validation', async () => {
    const { guard, resultsUtil } = createGuard({});

    await guard.canActivate(context);

    expect(resultsUtil.setup).toHaveBeenCalled();
  });
});
