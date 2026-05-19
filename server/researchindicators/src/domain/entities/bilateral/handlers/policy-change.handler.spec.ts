import { BadRequestException, ConflictException } from '@nestjs/common';
import { PolicyChangeBilateralIndicatorTypeHandler } from './policy-change.handler';

describe('PolicyChangeBilateralIndicatorTypeHandler', () => {
  const service = {
    create: jest.fn(),
    update: jest.fn(),
  };
  const handler = new PolicyChangeBilateralIndicatorTypeHandler(service as any);
  const ctx = { resultId: 77, resultCode: '123', indicatorCode: 'PC-1' };
  const dto = {
    policy_type_id: 1,
    policy_stage_id: 2,
    implementing_organizations: [{ institution_id: 3 }],
  } as any;

  beforeEach(() => jest.clearAllMocks());

  it('validates required fields and array shape', () => {
    expect(() => handler.validate(dto)).not.toThrow();
    expect(() =>
      handler.validate({ ...dto, implementing_organizations: undefined }),
    ).toThrow(BadRequestException);
    expect(() =>
      handler.validate({ ...dto, implementing_organizations: 'bad' }),
    ).toThrow(BadRequestException);
  });

  it('creates the type row, delegates update, and returns mapping FK', async () => {
    await expect(handler.upsert(ctx, dto)).resolves.toEqual({
      fkField: 'result_policy_change_id',
      fkId: 77,
    });

    expect(service.create).toHaveBeenCalledWith(77, undefined);
    expect(service.update).toHaveBeenCalledWith(
      77,
      expect.objectContaining({
        policy_type_id: 1,
        policy_stage_id: 2,
        implementing_organization: [{ institution_id: 3 }],
      }),
    );
  });

  it('continues when the result type row already exists', async () => {
    service.create.mockRejectedValueOnce(new ConflictException('exists'));

    await expect(handler.upsert(ctx, dto)).resolves.toEqual({
      fkField: 'result_policy_change_id',
      fkId: 77,
    });
    expect(service.update).toHaveBeenCalled();
  });

  it('rethrows non-conflict errors when ensuring the result type row', async () => {
    service.create.mockRejectedValueOnce(new Error('db unavailable'));

    await expect(handler.upsert(ctx, dto)).rejects.toThrow('db unavailable');
    expect(service.update).not.toHaveBeenCalled();
  });

  it('soft-deletes the result type row through the entity manager', async () => {
    const update = jest.fn().mockResolvedValue(undefined);
    const manager = {
      getRepository: jest.fn().mockReturnValue({ update }),
    } as any;

    await handler.delete({ ...ctx, manager });

    expect(manager.getRepository).toHaveBeenCalled();
    expect(update).toHaveBeenCalledWith(
      77,
      expect.objectContaining({
        is_active: false,
        deleted_at: expect.any(Date),
      }),
    );
  });
});
