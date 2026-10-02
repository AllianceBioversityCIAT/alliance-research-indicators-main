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
