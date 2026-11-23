import { BadRequestException, ValidationPipe } from '@nestjs/common';
import type { ArgumentMetadata } from '@nestjs/common';
import { UpdateControlListCategoryDto } from './update-control-list-category.dto';

/**
 * T-02 (institutional-performance/control-lists) rework attempt 2 — risk
 * Reviewer defect 2 (categories side). Exercises the EXACT pipe
 * `control-lists.controller.ts` installs on `PATCH /categories/:id`
 * (`new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true,
 * transform: true })`) without a Nest app or a DB;
 * `test/control-lists-categories.integration-spec.ts` proves the same thing
 * end to end against a real DB row (and is the only place that can
 * distinguish the 400 from the 500 the raw NOT NULL violation produced on
 * attempt-1 code).
 */
const pipe = new ValidationPipe({
  whitelist: true,
  forbidNonWhitelisted: true,
  transform: true,
});
const metadata: ArgumentMetadata = {
  type: 'body',
  metatype: UpdateControlListCategoryDto,
};

describe('UpdateControlListCategoryDto — null rejection on name (T-02 rework attempt 2)', () => {
  it('rejects {name: null} with a 400', async () => {
    await expect(
      pipe.transform({ name: null }, metadata),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('still accepts name when OMITTED entirely', async () => {
    const result = await pipe.transform({ description: 'unchanged' }, metadata);
    expect(result.name).toBeUndefined();
  });

  it('still accepts a real name (no false positive from the override)', async () => {
    const result = await pipe.transform({ name: 'Renamed' }, metadata);
    expect(result.name).toBe('Renamed');
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
