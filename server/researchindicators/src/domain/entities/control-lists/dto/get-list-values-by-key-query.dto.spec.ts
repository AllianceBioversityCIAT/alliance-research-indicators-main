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
 *
 * R-CLG-004: the read needs no scope parameter, so an empty query is valid.
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
  it('accepts an empty query (the key alone selects the list, R-CLG-004)', async () => {
    const result = await pipe.transform({}, metadata);
    expect(result).toBeInstanceOf(GetListValuesByKeyQueryDto);
  });

  it('defaults activeOnly to true when the query omits it', async () => {
    const result = await pipe.transform({}, metadata);
    expect(result.activeOnly).toBe(true);
  });

  it('parses the query string "false" as boolean false (NOT Boolean("false") === true)', async () => {
    const result = await pipe.transform({ activeOnly: 'false' }, metadata);
    expect(result.activeOnly).toBe(false);
  });

  it('parses the query string "true" as boolean true', async () => {
    const result = await pipe.transform({ activeOnly: 'true' }, metadata);
    expect(result.activeOnly).toBe(true);
  });

  it('rejects an unknown query field (forbidNonWhitelisted)', async () => {
    await expect(pipe.transform({ extra: 'x' }, metadata)).rejects.toThrow();
  });
});
