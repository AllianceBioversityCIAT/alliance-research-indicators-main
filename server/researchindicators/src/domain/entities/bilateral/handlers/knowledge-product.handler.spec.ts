import { BadRequestException, ConflictException } from '@nestjs/common';
import { KnowledgeProductBilateralIndicatorTypeHandler } from './knowledge-product.handler';

describe('KnowledgeProductBilateralIndicatorTypeHandler', () => {
  const service = {
    create: jest.fn(),
    update: jest.fn(),
  };
  const handler = new KnowledgeProductBilateralIndicatorTypeHandler(
    service as any,
  );
  const ctx = { resultId: 77, resultCode: '123', indicatorCode: 'KP-1' };
  const dto = {
    handle: 'hdl:10568/1',
    knowledge_product_type: 'JOURNAL',
    licence: 'CC-BY',
    peer_reviewed: true,
    is_isi: false,
    accessibility: true,
  } as any;

  beforeEach(() => jest.clearAllMocks());

  it('validates required fields', () => {
    expect(() => handler.validate(dto)).not.toThrow();
    expect(() => handler.validate({ ...dto, handle: '' })).toThrow(
      BadRequestException,
    );
  });

  it('creates the type row, delegates update, and returns mapping FK', async () => {
    await expect(handler.upsert(ctx, dto)).resolves.toEqual({
      fkField: 'result_knowledge_product_id',
      fkId: 77,
    });

    expect(service.create).toHaveBeenCalledWith(77, undefined);
    expect(service.update).toHaveBeenCalledWith(
      77,
      expect.objectContaining({
        type: 'JOURNAL',
        citation: 'hdl:10568/1',
        open_access: true,
      }),
    );
  });

  it('continues when the result type row already exists', async () => {
    service.create.mockRejectedValueOnce(new ConflictException('exists'));

    await expect(handler.upsert(ctx, dto)).resolves.toEqual({
      fkField: 'result_knowledge_product_id',
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
