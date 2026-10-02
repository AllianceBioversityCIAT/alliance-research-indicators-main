import { BadRequestException, ValidationPipe } from '@nestjs/common';
import type { ArgumentMetadata } from '@nestjs/common';
import { UpdateControlListDto } from './update-control-list.dto';

/**
 * T-02 (institutional-performance/control-lists) rework attempt 2 — risk
 * Reviewer defects 1 & 2. Exercises the EXACT pipe the controller installs
 * on `PATCH /lists/:id` (`control-lists.controller.ts`
 * `new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true,
 * transform: true })`), without a Nest app or a DB — this is the pipe-level
 * mechanism in isolation; `test/control-lists-lists.integration-spec.ts`
 * proves the same thing end to end against a real DB row.
 *
 * On attempt-1 code (`PartialType` with no override) every one of the
 * `.rejects` assertions below failed: `pipe.transform` RESOLVED instead of
 * rejecting, because class-validator's `@IsOptional()` treats `null` the
 * same as "omitted" and skips `@IsInt()` / `@IsString()` entirely.
 */
const pipe = new ValidationPipe({
  whitelist: true,
  forbidNonWhitelisted: true,
  transform: true,
});
const metadata: ArgumentMetadata = {
  type: 'body',
  metatype: UpdateControlListDto,
};

describe('UpdateControlListDto — null rejection on categoryId/name (T-02 rework attempt 2)', () => {
  it('rejects {categoryId: null} with a 400 (defect 1)', async () => {
    await expect(
      pipe.transform({ categoryId: null }, metadata),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects {name: null} with a 400 (defect 2)', async () => {
    await expect(
      pipe.transform({ name: null }, metadata),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('still accepts categoryId and name when OMITTED entirely', async () => {
    const result = await pipe.transform({ description: 'unchanged' }, metadata);
    expect(result.categoryId).toBeUndefined();
    expect(result.name).toBeUndefined();
  });

  it('still accepts a real categoryId and name (no false positive from the override)', async () => {
    const result = await pipe.transform(
      { categoryId: 4, name: 'Renamed' },
      metadata,
    );
    expect(result.categoryId).toBe(4);
    expect(result.name).toBe('Renamed');
  });

  // Defect 3 (shared mechanism check, DTO side only — storage normalization
  // is the service's job, asserted in control-lists.service.spec.ts and the
  // integration suite): description must NOT be rejected by the pipe for
  // '' or null, since both are valid "clear it" inputs.
  it.each([
    ['an empty string', ''],
    ['null', null],
  ])(
    'still accepts description: %s (not a validation error)',
    async (_label, description) => {
      const result = await pipe.transform({ description }, metadata);
      expect(result.description).toBe(description);
    },
  );
});
