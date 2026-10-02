import { PartialType, PickType } from '@nestjs/swagger';
import { ValidateIf } from 'class-validator';
import { CreateControlListDto } from './create-control-list.dto';

/**
 * A7: `{name?, description?, categoryId?}`. `listKey` and `codePrefix` are
 * deliberately NOT whitelisted here — the system key is immutable (R-CTL-003
 * "System key is fixed") and `ValidationPipe({ forbidNonWhitelisted: true })`
 * turns any attempt to send either field into a 400, never a silent change.
 */
export class UpdateControlListDto extends PartialType(
  PickType(CreateControlListDto, [
    'name',
    'description',
    'categoryId',
  ] as const),
) {
  // Risk Reviewer defect 1 (T-02 rework attempt 2): `PartialType` applies
  // `@IsOptional()` per field, and class-validator's `IsOptional` skips
  // EVERY OTHER validator on that property when the value is `null` —
  // not just when it's omitted. `{categoryId: null}` therefore reached
  // `updateList` as a literal `null`, which is `!== undefined`, so the
  // service called `findActiveCategoryOrFail(null)`; TypeORM's query
  // builder drops a `null` key from `where` entirely
  // (`SelectQueryBuilder.js:2468`), turning the lookup into
  // `WHERE is_active = 1` — the first active category, silently moving the
  // list. `@ValidateIf` and `@IsOptional` both register as class-validator
  // `CONDITIONAL_VALIDATION` metadata for the same propertyName, and
  // `MetadataStorage.getTargetValidationMetadatas` dedupes by
  // `(propertyName, type)`, preferring metadata declared directly on THIS
  // class over the inherited one (`class-validator/.../MetadataStorage.js`,
  // "prefer original metadatas instead of inherited metadatas"). So this
  // REPLACES the inherited `@IsOptional()` for `categoryId` — it does not
  // stack with it. Net effect: omitted → still skipped (valid); explicit
  // `null` → the inherited `@IsInt()` now runs against `null` → 400.
  @ValidateIf((dto: UpdateControlListDto) => dto.categoryId !== undefined)
  categoryId?: number;

  // Defect 2, same mechanism: `{name: null}` skipped `@IsString()` /
  // `@IsNotEmpty()`. Measured against attempt-1 code (not merely reasoned):
  // the service wrote a literal `null` into `name`, a NOT NULL column
  // (`control_lists.entity.ts`) — against this Dev MySQL (non-strict
  // `sql_mode`) that did NOT throw; MySQL silently coerced it to the
  // column's implicit default (`''`) and the request returned a plain 200
  // with the list renamed to an empty string
  // (`control-lists-lists.integration-spec.ts`, red run). Whether a given
  // MySQL reports errno 1048 or coerces silently is a server-config
  // variable this DTO cannot and should not depend on — rejecting `null`
  // in the pipe removes the dependency entirely. Same override technique
  // as `categoryId`.
  @ValidateIf((dto: UpdateControlListDto) => dto.name !== undefined)
  name?: string;
}
