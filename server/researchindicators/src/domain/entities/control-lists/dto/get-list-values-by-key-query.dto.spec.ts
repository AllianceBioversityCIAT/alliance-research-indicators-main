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
 * R-CLG-009 (T-02): `portfolioId` is an OPTIONAL filter (values with no
 * links + values linked to that portfolio), so a stale caller that still
 * sends it no longer gets a 400; a malformed one does.
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

  // R-CLG-009 (T-02): the optional portfolio filter.
  it('leaves portfolioId undefined when the query omits it (no filter)', async () => {
    const result = await pipe.transform({}, metadata);
    expect(result.portfolioId).toBeUndefined();
  });

  it('parses the query string "2" as the number 2', async () => {
    const result = await pipe.transform({ portfolioId: '2' }, metadata);
    expect(result.portfolioId).toBe(2);
  });

  it('combines portfolioId with activeOnly=false', async () => {
    const result = await pipe.transform(
      { portfolioId: '1', activeOnly: 'false' },
      metadata,
    );
    expect(result.portfolioId).toBe(1);
    expect(result.activeOnly).toBe(false);
  });

  it.each([
    ['a non-numeric value', 'abc'],
    ['zero', '0'],
    ['a negative id', '-1'],
    ['a non-integer', '1.5'],
    ['an empty string', ''],
  ])(
    'rejects portfolioId as %s with a 400 naming portfolioId',
    async (_label, portfolioId) => {
      let messages: string[] | undefined;
      try {
        await pipe.transform({ portfolioId }, metadata);
      } catch (error) {
        messages = (error as { response: { message: string[] } }).response
          .message;
      }
      expect(messages).toBeDefined();
      for (const message of messages) {
        expect(message).toContain('portfolioId');
        expect(message).not.toContain('should not exist');
      }
    },
  );
});
