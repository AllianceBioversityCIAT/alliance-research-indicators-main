import { BadRequestException, ConflictException } from '@nestjs/common';
import { InnovationDevelopmentBilateralIndicatorTypeHandler } from './innovation-development.handler';

describe('InnovationDevelopmentBilateralIndicatorTypeHandler', () => {
  const service = {
    create: jest.fn(),
    update: jest.fn(),
  };
  const handler = new InnovationDevelopmentBilateralIndicatorTypeHandler(
    service as any,
  );
  const ctx = { resultId: 77, resultCode: '123', indicatorCode: 'ID-1' };
  const dto = {
    innovation_typology: { code: 4 },
    innovation_developers: 'Alliance team',
    readinness_level_id: 5,
  } as any;

  beforeEach(() => jest.clearAllMocks());

  it('validates required fields and innovation typology code', () => {
    expect(() => handler.validate(dto)).not.toThrow();
    expect(() =>
      handler.validate({ ...dto, readinness_level_id: null }),
    ).toThrow(BadRequestException);
    expect(() => handler.validate({ ...dto, innovation_typology: {} })).toThrow(
      BadRequestException,
    );
  });

  it('creates the type row, delegates update, and returns mapping FK', async () => {
    await expect(handler.upsert(ctx, dto)).resolves.toEqual({
      fkField: 'result_innovation_dev_id',
      fkId: 77,
    });

    expect(service.create).toHaveBeenCalledWith(77, undefined);
    expect(service.update).toHaveBeenCalledWith(
      77,
      expect.objectContaining({
        innovation_type_id: 4,
        innovation_readiness_id: 5,
        short_title: 'Alliance team',
      }),
    );
  });

  it('continues when the result type row already exists', async () => {
    service.create.mockRejectedValueOnce(new ConflictException('exists'));

    await expect(handler.upsert(ctx, dto)).resolves.toEqual({
      fkField: 'result_innovation_dev_id',
      fkId: 77,
    });
    expect(service.update).toHaveBeenCalled();
  });

  it('rejects non-object innovation_typology with a clear error', () => {
    expect(() =>
      handler.validate({ ...dto, innovation_typology: 'INV-1' }),
    ).toThrow(BadRequestException);
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
