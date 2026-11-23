import { PartialType, PickType } from '@nestjs/swagger';
import { IsNotEmpty, ValidateIf } from 'class-validator';
import { CreateControlListValueDto } from './create-control-list-value.dto';

/**
 * A11: `{code?, value?, description?, displayOrder?, isActive?, portfolioIds?}`. `id` is
 * deliberately NOT whitelisted here (D-CTL-14) — the value's own PK is its
 * permanent reference, shown read-only in the table and the modal, and
 * `ValidationPipe({ forbidNonWhitelisted: true })` turns any attempt to send
 * it in the body into a 400, never a silent no-op.
 */
export class UpdateControlListValueDto extends PartialType(
  PickType(CreateControlListValueDto, [
    'code',
    'value',
    'description',
    'displayOrder',
    'isActive',
    'portfolioIds',
  ] as const),
) {
  // Same technique as UpdateControlListDto.categoryId/.name (T-02 rework,
  // forward pointer into T-03): `PartialType` applies `@IsOptional()` per
  // field, and class-validator's `IsOptional` skips every other validator
  // on that property when the value is `null`, not only when it is
  // omitted — so `{code: null}` would reach the service as a literal
  // `null`. `@ValidateIf` registers as class-validator CONDITIONAL_VALIDATION
  // metadata for the same propertyName and REPLACES the inherited
  // `@IsOptional()` (class-own metadata wins over inherited —
  // class-validator/.../MetadataStorage.js, "prefer original metadatas
  // instead of inherited metadatas"). Net effect: omitted → still skipped
  // (valid); explicit `null` → the inherited `@IsString()`/`@IsNotEmpty()`
  // now runs against `null` → 400, before the service (and its uniqueness
  // pre-check) ever runs.
  //
  // Rework attempt 2 (Leader decision, A11): `code` also gets `@IsNotEmpty()`
  // here, stacked alongside the inherited `@IsString()`/`@MaxLength(30)` —
  // the base `CreateControlListValueDto.code` has no `@IsNotEmpty()` at all
  // (A10 deliberately treats "" as "propose a code", not a validation
  // error), so this update-only DTO adds its own. `code` also inherits the
  // base DTO's `@Transform` (trim), so a whitespace-only `"   "` collapses
  // to `""` by the time `@IsNotEmpty()` runs — reaching the SAME 400 as an
  // explicit `""`, closing the Reviewer's "whitespace" case.
  @ValidateIf((dto: UpdateControlListValueDto) => dto.code !== undefined)
  @IsNotEmpty()
  code?: string;

  @ValidateIf((dto: UpdateControlListValueDto) => dto.value !== undefined)
  value?: string;

  // Same family (Leader decision, A11): `displayOrder: null` and
  // `isActive: null` must 400, not silently no-op. Neither property needs a
  // new validator here — `@ValidateIf` replaces only the inherited
  // `@IsOptional()` (same mechanism as `code`/`value` above), so the
  // inherited `@IsInt()`/`@Min(0)` (displayOrder) and `@IsBoolean()`
  // (isActive) now run against an explicit `null` and reject it.
  @ValidateIf(
    (dto: UpdateControlListValueDto) => dto.displayOrder !== undefined,
  )
  displayOrder?: number;

  @ValidateIf((dto: UpdateControlListValueDto) => dto.isActive !== undefined)
  isActive?: boolean;
  // R-CLG-009 / R3-1: `portfolioIds` is picked above (otherwise
  // `forbidNonWhitelisted` would reject the field outright) and re-declared
  // here, for the same reason as `code`/`value`/`displayOrder`/`isActive`:
  // `PartialType` re-applies `@IsOptional()` to every picked key, which skips
  // the inherited `@IsArray()`/`@ArrayUnique()`/`@IsInt()` for `null` and would
  // let `portfolioIds: null` reach the service. The class's own
  // `@ValidateIf` REPLACES that inherited `@IsOptional()`: omitted -> skipped
  // (the current set is kept), `null` -> 400. `[]` clears the set (the value
  // then applies to all); a list replaces it.
  @ValidateIf(
    (dto: UpdateControlListValueDto) => dto.portfolioIds !== undefined,
  )
  portfolioIds?: number[];
}
