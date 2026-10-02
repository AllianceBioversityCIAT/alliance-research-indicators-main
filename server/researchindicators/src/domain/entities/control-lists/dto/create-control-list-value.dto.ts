import { ApiPropertyOptional, ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
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
}
