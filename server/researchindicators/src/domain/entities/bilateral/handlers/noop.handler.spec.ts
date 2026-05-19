import { BadRequestException } from '@nestjs/common';
import { NoopBilateralIndicatorTypeHandler } from './noop.handler';

describe('NoopBilateralIndicatorTypeHandler', () => {
  const handler = new NoopBilateralIndicatorTypeHandler();

  it('requires a narrative for unsupported output/outcome mappings', () => {
    expect(() =>
      handler.validate({ narrative: 'Some contribution' } as any),
    ).not.toThrow();
    expect(() => handler.validate({} as any)).toThrow(BadRequestException);
  });

  it('does not return a typed result foreign key', async () => {
    await expect(
      handler.upsert(
        { resultId: 77, resultCode: '123', indicatorCode: 'OO-1' },
        {
          narrative: 'Some contribution',
        } as any,
      ),
    ).resolves.toEqual({ fkField: null, fkId: null });
  });

  it('returns undefined on delete because there is no typed row to remove', async () => {
    await expect(
      handler.delete({
        resultId: 77,
        resultCode: '123',
        indicatorCode: 'OO-1',
      }),
    ).resolves.toBeUndefined();
  });
});
