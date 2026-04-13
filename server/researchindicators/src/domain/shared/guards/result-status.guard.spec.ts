import { BadRequestException } from '@nestjs/common';
import { ExecutionContext } from '@nestjs/common';
import { ResultStatusGuard } from './result-status.guard';
import { ResultStatusEnum } from '../../entities/result-status/enum/result-status.enum';

describe('ResultStatusGuard', () => {
  const setup = (result_status_id: number) => {
    const findOne = jest.fn().mockResolvedValue({ result_status_id });
    const getRepository = jest.fn().mockReturnValue({ findOne });
    const dataSource = { getRepository } as any;
    const resultsUtil = {
      setup: jest.fn().mockResolvedValue(undefined),
      resultId: 1,
    } as any;
    const guard = new ResultStatusGuard(dataSource, resultsUtil);
    return { guard, findOne, getRepository, resultsUtil };
  };

  it('should allow editable statuses', async () => {
    const { guard } = setup(ResultStatusEnum.DRAFT);
    await expect(
      guard.canActivate({} as ExecutionContext),
    ).resolves.toBe(true);
  });

  it('should reject non-editable status', async () => {
    const { guard } = setup(ResultStatusEnum.SUBMITTED);
    await expect(guard.canActivate({} as ExecutionContext)).rejects.toThrow(
      BadRequestException,
    );
  });
});
