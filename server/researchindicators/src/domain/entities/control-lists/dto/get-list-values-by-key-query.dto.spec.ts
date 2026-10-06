import { ValidationPipe } from '@nestjs/common';
import type { ArgumentMetadata } from '@nestjs/common';
import { GetListValuesByKeyQueryDto } from './get-list-values-by-key-query.dto';

/**
 * T-04 — exercises the EXACT pipe `control-lists.controller.ts` installs on
 * `GET /by-key/:listKey/values` (`new ValidationPipe({ whitelist: true,
 * forbidNonWhitelisted: true, transform: true })`), same technique as
 * `update-control-list-category.dto.spec.ts`. `@Type(() => Boolean)` alone
 * would make `activeOnly=false` resolve to `true` (`Boolean('false') ===
 * true`) — the regression this file pins against.
 */
const pipe = new ValidationPipe({
  whitelist: true,
  forbidNonWhitelisted: true,
  transform: true,
});
const metadata: ArgumentMetadata = {
  type: 'query',
  metatype: GetListValuesByKeyQueryDto,
};

describe('GetListValuesByKeyQueryDto (A13 query)', () => {
  it('defaults activeOnly to true when the query omits it', async () => {
    const result = await pipe.transform({ portfolioId: '2' }, metadata);
    expect(result.activeOnly).toBe(true);
  });

  it('parses the query string "false" as boolean false (NOT Boolean("false") === true)', async () => {
    const result = await pipe.transform(
      { portfolioId: '2', activeOnly: 'false' },
      metadata,
    );
    expect(result.activeOnly).toBe(false);
  });

  it('parses the query string "true" as boolean true', async () => {
    const result = await pipe.transform(
      { portfolioId: '2', activeOnly: 'true' },
      metadata,
    );
    expect(result.activeOnly).toBe(true);
  });

  it('coerces portfolioId from a query string to a number', async () => {
    const result = await pipe.transform({ portfolioId: '7' }, metadata);
    expect(result.portfolioId).toBe(7);
  });

  it('rejects a missing portfolioId with a 400', async () => {
    await expect(pipe.transform({}, metadata)).rejects.toThrow();
  });

  it('rejects an unknown query field (forbidNonWhitelisted)', async () => {
    await expect(
      pipe.transform({ portfolioId: '2', extra: 'x' }, metadata),
    ).rejects.toThrow();
  });
});
