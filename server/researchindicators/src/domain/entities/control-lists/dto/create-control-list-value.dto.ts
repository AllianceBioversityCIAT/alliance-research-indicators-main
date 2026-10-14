import { ApiPropertyOptional, ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
  ValidateIf,
} from 'class-validator';

export class CreateControlListValueDto {
  @ApiPropertyOptional({
    type: String,
    description:
      'Value code. Omit (or send "", whitespace-only, or null) to let the ' +
      'service propose the next "<prefix>-<nn>" (or "L<n>" for org.level) ' +
      'code in the list (design.md §5 rule 4, Leader decision T-03 rework ' +
      'attempt 2); a supplied code is trimmed before validation and the ' +
      'admin can still edit it',
    maxLength: 30,
  })
  // T-03 rework attempt 2 (Leader decision, A10): a non-empty code is
  // trimmed before it reaches `@MaxLength`/the service, so " ABC " and
  // "ABC" validate and store identically, and a whitespace-only code
  // ("   ") collapses to "" here — which `UpdateControlListValueDto`
  // (A11) then rejects via its own `@IsNotEmpty()` override, while THIS
  // (create) DTO deliberately does NOT reject "" / null: the service
  // (`ControlListsService.createValue`) treats an empty/omitted code as
  // "propose one" (rule 4), never as a validation error. `null` is passed
  // through unchanged (not a string, nothing to trim) — `@IsOptional()`
  // below still lets it reach the service as a literal `null`, which the
  // service also treats as "propose".
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsOptional()
  @IsString()
  @MaxLength(30)
  code?: string;

  @ApiProperty({
    type: String,
    description: 'Value name',
    example: 'Increase',
    minLength: 1,
    maxLength: 150,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  @MaxLength(150)
  value!: string;

  @ApiPropertyOptional({
    type: String,
    description: 'Optional value description',
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiPropertyOptional({
    type: Number,
    description: 'Display order within the list',
    minimum: 0,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  displayOrder?: number;

  @ApiPropertyOptional({
    type: Boolean,
    description: 'Active flag (D-CTL-4: the inherited is_active). Default true',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
  // R-CLG-009 "Applies to": the portfolios this value applies to. Omitted or
  // `[]` = every portfolio. Validated with `@ValidateIf(... !== undefined)`
  // and deliberately WITHOUT `@IsOptional()`: on one class, class-validator
  // ANDs conditional validators, and `@IsOptional()` skips every validator for
  // `null` as well as `undefined`, so it would let `portfolioIds: null`
  // through (design §2.1; tasks.md T-02 falsifier 2). With `@ValidateIf`
  // alone, only an omitted field is skipped and `null` hits `@IsArray()` -> 400.
  // Whether the ids exist and are active is the service's check (400 naming
  // `portfolioIds`), because it needs the database.
  @ApiPropertyOptional({
    type: [Number],
    description:
      'Ids of the portfolios this value applies to ("Applies to"). Omit or send ' +
      '[] for every portfolio. Ids must be distinct, positive integers of ' +
      'active portfolios; anything else (including null) is a 400 naming ' +
      'portfolioIds',
    example: [2],
  })
  @ValidateIf(
    (dto: CreateControlListValueDto) => dto.portfolioIds !== undefined,
  )
  @IsArray()
  @ArrayUnique()
  @IsInt({ each: true })
  @Min(1, { each: true })
  portfolioIds?: number[];
}
