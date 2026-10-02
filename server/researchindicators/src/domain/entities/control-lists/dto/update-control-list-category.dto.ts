import { PartialType, PickType } from '@nestjs/swagger';
import { ValidateIf } from 'class-validator';
import { CreateControlListCategoryDto } from './create-control-list-category.dto';

/**
 * A4: `{name?, description?}`. `portfolioId` is deliberately NOT whitelisted
 * here — categories cannot be moved across portfolios in this slice, and
 * `ValidationPipe({ forbidNonWhitelisted: true })` turns any attempt into a
 * 400 instead of silently reassigning the portfolio.
 */
export class UpdateControlListCategoryDto extends PartialType(
  PickType(CreateControlListCategoryDto, ['name', 'description'] as const),
) {
  // Risk Reviewer defect 2 (T-02 rework attempt 2), same hole as
  // UpdateControlListDto (see its `categoryId`/`name` comment for the full
  // metadata-dedup mechanism). Measured against attempt-1 code: unlike the
  // list side, a category update runs a duplicate-name pre-check first
  // (`assertCategoryNameAvailable`) — its `findOne({ where: { name: null,
  // ... } })` fell prey to the SAME TypeORM null-key-drop behavior
  // (`SelectQueryBuilder.js:2468`) and matched the first active category
  // in the portfolio, so the observed status was a bogus **409** Conflict,
  // not the 500 originally hypothesized
  // (`control-lists-categories.integration-spec.ts`, red run) — the
  // predicted P-14 500 is what the *list* side showed instead (see
  // `update-control-list.dto.ts`). Either way the result was never a clean
  // 400. `@ValidateIf` replaces the inherited `@IsOptional()` for `name`:
  // omitted stays valid, explicit `null` now runs
  // `@IsString()`/`@IsNotEmpty()` against `null` → 400, before the service
  // (and its pre-check) ever runs.
  @ValidateIf((dto: UpdateControlListCategoryDto) => dto.name !== undefined)
  name?: string;
}
