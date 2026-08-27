import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  Min,
  ValidateIf,
  ValidateNested,
  ValidationArguments,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
  registerDecorator,
} from 'class-validator';
import { ClarisaActorTypesEnum } from '../../../tools/clarisa/entities/clarisa-actor-types/enum/clarisa-actor-types.enum';

/**
 * T-02 (R-IUA-004 AC.3, AC.4 + scenario `The two modes cannot both be populated`).
 *
 * Cross-field, per-row constraint: an actor row's aggregate count
 * (`actors_count`) and its four disaggregated counts are mutually exclusive,
 * driven by `sex_age_disaggregation_not_apply`. Attached to each count field
 * individually rather than to the mode flag itself, so the check is gated by
 * *that field's own* `@IsOptional()` presence condition — a field that is
 * genuinely absent cannot conflict with anything, and does not need the rule
 * to run. Attaching it to `sex_age_disaggregation_not_apply` instead would
 * have the rule silently skipped whenever the flag itself is absent (the
 * exact "false/absent" case AC.4 must still catch).
 */
@ValidatorConstraint({ name: 'isActorCountModeExclusive', async: false })
class IsActorCountModeExclusiveConstraint
  implements ValidatorConstraintInterface
{
  validate(value: unknown, args: ValidationArguments): boolean {
    if (value === undefined || value === null) return true;
    const row = args.object as InnovationUseActorDto;
    const mode = args.constraints[0] as 'aggregate' | 'disaggregated';
    const disaggregationNotApply =
      row.sex_age_disaggregation_not_apply === true;
    return mode === 'disaggregated'
      ? !disaggregationNotApply
      : disaggregationNotApply;
  }

  defaultMessage(args: ValidationArguments): string {
    const mode = args.constraints[0] as 'aggregate' | 'disaggregated';
    return mode === 'disaggregated'
      ? `${args.property}: sex_age_disaggregation_not_apply is true, so a disaggregated count must not be supplied`
      : `${args.property}: sex_age_disaggregation_not_apply is not true, so actors_count must not be supplied`;
  }
}

function IsExclusiveOfActorMode(
  mode: 'aggregate' | 'disaggregated',
  validationOptions?: ValidationOptions,
): PropertyDecorator {
  return (object: object, propertyName: string | symbol) => {
    registerDecorator({
      name: 'isActorCountModeExclusive',
      target: object.constructor,
      propertyName: propertyName as string,
      options: validationOptions,
      constraints: [mode],
      validator: IsActorCountModeExclusiveConstraint,
    });
  };
}

/**
 * T-04 (R-MSD-003, R-MSD-007; `design.md` DD-8, DD-17, DC-15).
 *
 * `quantification_number` only — the six sibling count fields keep their
 * `@IsInt() @Min(0)` untouched. Replaces that pair with a signed,
 * scale-bounded decimal check: finite, within DD-14's derived magnitude
 * bound (`549_755_813_887` at scale 4), at most 4 fractional digits.
 *
 * Deliberately **not** `@IsNumber({ maxDecimalPlaces: 4 })` — `class-validator`
 * derives the scale via `value.toString().split('.')[1].length`, which
 * throws a `TypeError` (surfacing as a `500`) whenever `toString()` yields
 * exponential notation with no `.` (`J-15`, `DC-15`).
 *
 * The four steps are a MANDATED order, each gating the next:
 *   ① reject anything that is not a `number` (the resent-string read shape);
 *   ② reject non-finite (`NaN`, `±Infinity`);
 *   ③ reject outside the DD-14 bound — MUST run before any string
 *      conversion. Skipping ahead here is the whole bug: `1e21` would reach
 *      step ④'s `String()` and reproduce the very `TypeError` this
 *      constraint exists to remove;
 *   ④ only then derive the scale from the value's decimal string form.
 *      Not via `toFixed` at high precision — `(2.55).toFixed(20)` rejects a
 *      legal value, and `(1e-7).toFixed(4)` silently rounds to `"0.0000"`.
 *      After step ③ has passed, a value whose `String()` form is
 *      exponential can only be `|v| < 1e-6` (step ③ already excluded
 *      `|v| ≥ 1e21`), which always carries more than 4 decimals — so an
 *      exponential string is rejected outright, never parsed further.
 */
const QUANTIFICATION_NUMBER_MAX = 549_755_813_887; // DD-14, scale 4
const QUANTIFICATION_NUMBER_MIN = -QUANTIFICATION_NUMBER_MAX;
const QUANTIFICATION_NUMBER_MAX_DECIMALS = 4;

@ValidatorConstraint({ name: 'isScaleBoundedSignedDecimal', async: false })
class IsScaleBoundedSignedDecimalConstraint
  implements ValidatorConstraintInterface
{
  validate(value: unknown): boolean {
    // ① reject anything that is not a `number`
    if (typeof value !== 'number') return false;
    // ② reject non-finite
    if (!Number.isFinite(value)) return false;
    // ③ reject outside DD-14's bound — before any string conversion
    if (
      value < QUANTIFICATION_NUMBER_MIN ||
      value > QUANTIFICATION_NUMBER_MAX
    ) {
      return false;
    }
    // ④ only then derive the scale
    const stringValue = String(value);
    if (stringValue.includes('e') || stringValue.includes('E')) return false;
    const dotIndex = stringValue.indexOf('.');
    return (
      dotIndex === -1 ||
      stringValue.length - dotIndex - 1 <= QUANTIFICATION_NUMBER_MAX_DECIMALS
    );
  }

  defaultMessage(args: ValidationArguments): string {
    return (
      `${args.property} must be a finite number with at most ` +
      `${QUANTIFICATION_NUMBER_MAX_DECIMALS} decimal places, between ` +
      `${QUANTIFICATION_NUMBER_MIN} and ${QUANTIFICATION_NUMBER_MAX}`
    );
  }
}

function IsScaleBoundedSignedDecimal(
  validationOptions?: ValidationOptions,
): PropertyDecorator {
  return (object: object, propertyName: string | symbol) => {
    registerDecorator({
      name: 'isScaleBoundedSignedDecimal',
      target: object.constructor,
      propertyName: propertyName as string,
      options: validationOptions,
      constraints: [],
      validator: IsScaleBoundedSignedDecimalConstraint,
    });
  };
}

export class InnovationUseActorDto {
  @IsNumber()
  @IsOptional()
  @ApiProperty({ required: false })
  result_actors_id?: number;

  @IsNotEmpty()
  @IsNumber()
  @ApiProperty()
  actor_type_id!: number;

  @ValidateIf(
    (o: InnovationUseActorDto) =>
      o.actor_type_id === ClarisaActorTypesEnum.OTHER,
  )
  @Matches(/\S/, {
    message: 'actor_type_custom_name is required when actor_type_id is OTHER',
  })
  @ApiProperty({ required: false })
  actor_type_custom_name?: string;

  @IsOptional()
  @ApiProperty({ required: false })
  sex_age_disaggregation_not_apply?: boolean;

  @IsInt()
  @Min(0)
  @IsOptional()
  @IsExclusiveOfActorMode('disaggregated')
  @ApiProperty({ required: false })
  women_youth_count?: number;

  @IsInt()
  @Min(0)
  @IsOptional()
  @IsExclusiveOfActorMode('disaggregated')
  @ApiProperty({ required: false })
  women_not_youth_count?: number;

  @IsInt()
  @Min(0)
  @IsOptional()
  @IsExclusiveOfActorMode('disaggregated')
  @ApiProperty({ required: false })
  men_youth_count?: number;

  @IsInt()
  @Min(0)
  @IsOptional()
  @IsExclusiveOfActorMode('disaggregated')
  @ApiProperty({ required: false })
  men_not_youth_count?: number;

  @IsInt()
  @Min(0)
  @IsOptional()
  @IsExclusiveOfActorMode('aggregate')
  @ApiProperty({ required: false })
  actors_count?: number;
}

export class InnovationUseOrganizationDto {
  @IsNumber()
  @IsOptional()
  @ApiProperty({ required: false })
  result_institution_type_id?: number;

  @IsNumber()
  @IsOptional()
  @ApiProperty({ required: false })
  institution_type_id?: number;

  @IsNumber()
  @IsOptional()
  @ApiProperty({ required: false })
  sub_institution_type_id?: number;

  @IsString()
  @IsOptional()
  @ApiProperty({ required: false })
  institution_type_custom_name?: string;

  @IsOptional()
  @ApiProperty({ required: false })
  is_organization_known?: boolean;

  @IsNumber()
  @IsOptional()
  @ApiProperty({ required: false })
  institution_id?: number;

  @IsInt()
  @Min(0)
  @IsOptional()
  @ApiProperty({ required: false })
  organization_count?: number;
}

export class InnovationUseQuantificationDto {
  @IsNumber()
  @IsOptional()
  @ApiProperty({ required: false })
  id?: number;

  @IsScaleBoundedSignedDecimal()
  @IsOptional()
  @ApiProperty({ required: false })
  quantification_number?: number;

  @IsString()
  @IsOptional()
  @ApiProperty({ required: false })
  unit?: string;

  @IsString()
  @IsOptional()
  @ApiProperty({ required: false })
  description?: string;
}

export class CreateResultInnovationUseDto {
  @IsNumber()
  @IsOptional()
  @ApiProperty({ required: false })
  innovation_use_level_id?: number;

  @IsString()
  @IsOptional()
  @ApiProperty({ required: false })
  innovation_use_level_explanation?: string;

  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => InnovationUseActorDto)
  @ApiProperty({ type: [InnovationUseActorDto], required: false })
  actors?: InnovationUseActorDto[];

  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => InnovationUseOrganizationDto)
  @ApiProperty({ type: [InnovationUseOrganizationDto], required: false })
  organizations?: InnovationUseOrganizationDto[];

  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => InnovationUseQuantificationDto)
  @ApiProperty({ type: [InnovationUseQuantificationDto], required: false })
  quantifications?: InnovationUseQuantificationDto[];
}
