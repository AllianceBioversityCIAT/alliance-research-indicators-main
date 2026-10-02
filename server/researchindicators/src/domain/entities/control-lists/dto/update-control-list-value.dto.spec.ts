import { BadRequestException, ValidationPipe } from '@nestjs/common';
import type { ArgumentMetadata } from '@nestjs/common';
import { UpdateControlListValueDto } from './update-control-list-value.dto';

/**
 * T-03 (institutional-performance/control-lists) — read-only permanent ID
 * (D-CTL-14, falsifier 2) and the null-rejection override on code/value
 * (forward pointer from T-02 attempt 2's `@ValidateIf` technique). Exercises
 * the EXACT pipe the controller installs on `PATCH /values/:id`
 * (`control-lists.controller.ts`
 * `new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true,
 * transform: true })`), without a Nest app or a DB —
 * `test/control-lists-values.integration-spec.ts` proves the same thing end
 * to end against a real DB row.
 *
 * Rework attempt 2 (Reviewer risk-lens FAIL): attempt 1 rejected
 * `code: null` but NOT `code: ''` (no `@IsNotEmpty()` existed on either DTO)
 * and did not reject `displayOrder: null` / `isActive: null` at all — both
 * silently reached the service as a literal `null` and either no-opped the
 * update (`dto.X !== undefined` was true, since `null !== undefined`) or
 * stored `null` into a NOT NULL column. Leader decision (A11): `code`
 * ('' / whitespace / null), `value` ('' / null), `displayOrder` (null) and
 * `isActive` (null) all 400 on this DTO — unlike A10, where the SAME empty
 * code means "propose one" instead.
 */
const pipe = new ValidationPipe({
  whitelist: true,
  forbidNonWhitelisted: true,
  transform: true,
});
const metadata: ArgumentMetadata = {
  type: 'body',
  metatype: UpdateControlListValueDto,
};

describe('UpdateControlListValueDto — read-only id and null rejection on code/value (T-03)', () => {
  // Falsifier 2 (tasks.md T-03): whitelisting `id` would make this resolve
  // instead of reject.
  it('rejects a body containing id with a 400 (D-CTL-14, falsifier 2)', async () => {
    await expect(
      pipe.transform({ id: 99, value: 'Renamed' }, metadata),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects {code: null} with a 400', async () => {
    await expect(
      pipe.transform({ code: null }, metadata),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  // Rework attempt 2: attempt-1 code had no @IsNotEmpty() on `code` at all
  // (neither the base create DTO nor this update override), so {code: ''}
  // passed the pipe and blanked the stored code on PATCH.
  it('rejects {code: ""} with a 400 (rework attempt 2)', async () => {
    await expect(pipe.transform({ code: '' }, metadata)).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  // The base DTO's inherited @Transform (trim) collapses this to '' before
  // @IsNotEmpty() runs, so a whitespace-only code 400s the same way.
  it('rejects {code: "   "} (whitespace-only) with a 400 (rework attempt 2)', async () => {
    await expect(
      pipe.transform({ code: '   ' }, metadata),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects {value: null} with a 400', async () => {
    await expect(
      pipe.transform({ value: null }, metadata),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  // Already covered by the inherited @IsNotEmpty()/@MinLength(1) from
  // CreateControlListValueDto.value — asserted explicitly here per the
  // Leader's A11 decision list (rework attempt 2), not because the
  // mechanism changed.
  it('rejects {value: ""} with a 400', async () => {
    await expect(
      pipe.transform({ value: '' }, metadata),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  // Rework attempt 2 (Leader decision, A11): attempt-1 code had no
  // @ValidateIf override on displayOrder/isActive, so `null` reached the
  // service as a literal null and either no-opped the update or stored
  // null into a NOT NULL column.
  it('rejects {displayOrder: null} with a 400 (rework attempt 2)', async () => {
    await expect(
      pipe.transform({ displayOrder: null }, metadata),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects {isActive: null} with a 400 (rework attempt 2)', async () => {
    await expect(
      pipe.transform({ isActive: null }, metadata),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('still accepts code and value when OMITTED entirely', async () => {
    const result = await pipe.transform({ description: 'unchanged' }, metadata);
    expect(result.code).toBeUndefined();
    expect(result.value).toBeUndefined();
  });

  it('still accepts a real code and value (no false positive from the override)', async () => {
    const result = await pipe.transform(
      { code: 'DIR-09', value: 'Renamed' },
      metadata,
    );
    expect(result.code).toBe('DIR-09');
    expect(result.value).toBe('Renamed');
  });

  it('still accepts displayOrder: 0 and isActive: false (falsy, not null)', async () => {
    const result = await pipe.transform(
      { displayOrder: 0, isActive: false },
      metadata,
    );
    expect(result.displayOrder).toBe(0);
    expect(result.isActive).toBe(false);
  });

  it('still accepts displayOrder and isActive when OMITTED entirely', async () => {
    const result = await pipe.transform({ description: 'unchanged' }, metadata);
    expect(result.displayOrder).toBeUndefined();
    expect(result.isActive).toBeUndefined();
  });

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
