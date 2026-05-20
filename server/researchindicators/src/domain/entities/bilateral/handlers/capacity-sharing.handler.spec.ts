import { BadRequestException, ConflictException } from '@nestjs/common';
import { CapacitySharingBilateralIndicatorTypeHandler } from './capacity-sharing.handler';

describe('CapacitySharingBilateralIndicatorTypeHandler', () => {
  const service = {
    create: jest.fn(),
    update: jest.fn(),
  };
  const handler = new CapacitySharingBilateralIndicatorTypeHandler(
    service as any,
  );
  const ctx = { resultId: 77, resultCode: '123', indicatorCode: 'CS-1' };
  const dto = {
    women: 2,
    men: 3,
    non_binary: 1,
    has_unkown_using: false,
    capdev_term_id: 4,
    capdev_delivery_method_id: 5,
  } as any;

  beforeEach(() => jest.clearAllMocks());

  it('validates required backend-compatible fields', () => {
    expect(() => handler.validate(dto)).not.toThrow();
    expect(() => handler.validate({ ...dto, women: undefined })).toThrow(
      BadRequestException,
    );
  });

  it('creates the type row, delegates update, and returns mapping FK', async () => {
    await expect(handler.upsert(ctx, dto)).resolves.toEqual({
      fkField: 'result_capacity_sharing_id',
      fkId: 77,
    });

    expect(service.create).toHaveBeenCalledWith(77, undefined);
    expect(service.update).toHaveBeenCalledWith(
      77,
      expect.objectContaining({
        session_length_id: 4,
        delivery_modality_id: 5,
        group: expect.objectContaining({
          session_participants_total: 6,
        }),
      }),
    );
  });

  it('continues when the result type row already exists', async () => {
    service.create.mockRejectedValueOnce(
      new ConflictException('Result capacity sharing already exists'),
    );

    await expect(handler.upsert(ctx, dto)).resolves.toEqual({
      fkField: 'result_capacity_sharing_id',
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
