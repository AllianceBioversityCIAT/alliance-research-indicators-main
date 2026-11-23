import { ValidationPipe } from '@nestjs/common';
import type { ArgumentMetadata } from '@nestjs/common';
import { CreateControlListValueDto } from './create-control-list-value.dto';

/**
 * T-03 (institutional-performance/control-lists) rework attempt 2 — Reviewer
 * risk-lens FAIL: "A value can be saved with an empty code, and a null code
 * on create is not rejected with a 400." Leader decision (A10): code
 * omitted / '' / whitespace / null all mean "let the service propose one"
 * (design.md §5 rule 4) — they must NOT be rejected by the pipe, and a
 * whitespace-only code must collapse to the SAME shape ('') the service
 * already treats as "propose". A non-empty code is trimmed before
 * `@MaxLength(30)` runs.
 *
 * Exercises the EXACT pipe `control-lists.controller.ts` installs on
 * `POST /lists/:id/values` (`new ValidationPipe({ whitelist: true,
 * forbidNonWhitelisted: true, transform: true })`), without a Nest app or a
 * DB — `test/control-lists-values.integration-spec.ts` proves the same
 * contract end to end (201 with a proposed code) against a real DB row.
 */
const pipe = new ValidationPipe({
  whitelist: true,
  forbidNonWhitelisted: true,
  transform: true,
});
const metadata: ArgumentMetadata = {
  type: 'body',
  metatype: CreateControlListValueDto,
};

describe('CreateControlListValueDto — code propose-vs-reject and trim (T-03 rework attempt 2)', () => {
  it('passes code: "" through unchanged (the pipe never rejects it — the service proposes)', async () => {
    const result = await pipe.transform(
      { code: '', value: 'Decrease' },
      metadata,
    );
    expect(result.code).toBe('');
  });

  it('collapses a whitespace-only code to "" (same shape as an explicit empty string)', async () => {
    const result = await pipe.transform(
      { code: '   ', value: 'Decrease' },
      metadata,
    );
    expect(result.code).toBe('');
  });

  it('passes code: null through unchanged (not a string — nothing to trim; the service proposes)', async () => {
    const result = await pipe.transform(
      { code: null, value: 'Decrease' },
      metadata,
    );
    expect(result.code).toBeNull();
  });

  it('passes code when OMITTED entirely', async () => {
    const result = await pipe.transform({ value: 'Decrease' }, metadata);
    expect(result.code).toBeUndefined();
  });

  it('trims a real supplied code before validation', async () => {
    const result = await pipe.transform(
      { code: '  DIR-09  ', value: 'Decrease' },
      metadata,
    );
    expect(result.code).toBe('DIR-09');
  });

  it('still enforces @MaxLength(30) on the TRIMMED value', async () => {
    const tooLong = 'A'.repeat(31);
    await expect(
      pipe.transform({ code: `  ${tooLong}  `, value: 'Decrease' }, metadata),
    ).rejects.toThrow();
  });

  it('a code of exactly 30 chars after trimming still passes', async () => {
    const thirty = 'A'.repeat(30);
    const result = await pipe.transform(
      { code: `  ${thirty}  `, value: 'Decrease' },
      metadata,
    );
    expect(result.code).toBe(thirty);
  });
});

/**
 * T-02 (changes/control-lists-global-scope) — R-CLG-009 AC.4: the value's
 * optional `portfolioIds` ("Applies to") on A10. Omitted and `[]` are valid
 * (apply to all portfolios); `null`, a repeated id, a non-integer or an id
 * below 1 is a 400 naming `portfolioIds`.
 *
 * `null` is the case that needs the DTO's own `@ValidateIf(o => o.portfolioIds
 * !== undefined)` WITHOUT `@IsOptional()`: class-validator ANDs the two
 * conditional validators on one class, and `@IsOptional()` skips every
 * validator for `null` — so adding it back lets `null` through (falsifier 2 in
 * tasks.md T-02).
 */
describe('CreateControlListValueDto — portfolioIds (R-CLG-009, T-02)', () => {
  const rejectedWith = async (portfolioIds: unknown): Promise<string[]> => {
    try {
      await pipe.transform({ value: 'Decrease', portfolioIds }, metadata);
    } catch (error) {
      return (error as { response: { message: string[] } }).response.message;
    }
    throw new Error('expected the pipe to reject');
  };

  it.each([
    ['null', null],
    ['a repeated id', [1, 1]],
    ['a non-numeric id', ['a']],
    ['zero', [0]],
    ['a negative id', [-1]],
    ['a non-integer id', [1.5]],
    ['a non-array value', 1],
  ])(
    'rejects portfolioIds: %s with a 400 naming portfolioIds',
    async (_label, portfolioIds) => {
      const messages = await rejectedWith(portfolioIds);
      expect(messages.length).toBeGreaterThan(0);
      for (const message of messages) {
        expect(message).toContain('portfolioIds');
        // A property that is not whitelisted is ALSO a 400 naming it, so the
        // assertion above alone cannot tell "field not declared" from "field
        // declared and its value rejected": only the latter is the contract.
        expect(message).not.toContain('should not exist');
      }
    },
  );

  it('accepts portfolioIds when OMITTED entirely', async () => {
    const result = await pipe.transform({ value: 'Decrease' }, metadata);
    expect(result.portfolioIds).toBeUndefined();
  });

  it('accepts an empty array (applies to all portfolios)', async () => {
    const result = await pipe.transform(
      { value: 'Decrease', portfolioIds: [] },
      metadata,
    );
    expect(result.portfolioIds).toEqual([]);
  });

  it('accepts a list of distinct positive integers', async () => {
    const result = await pipe.transform(
      { value: 'Decrease', portfolioIds: [1, 2] },
      metadata,
    );
    expect(result.portfolioIds).toEqual([1, 2]);
  });
});
