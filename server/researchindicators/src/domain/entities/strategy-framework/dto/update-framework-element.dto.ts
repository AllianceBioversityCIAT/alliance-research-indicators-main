import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsArray,
  IsInt,
  IsNotEmpty,
  IsString,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';
import {
  CODE_MAX_LENGTH,
  NAME_MAX_LENGTH,
} from '../strategy-framework.constants';

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

const present = (_object: unknown, value: unknown) => value !== undefined;

/**
 * A6 body. Every field is optional. `parentId` omitted means no move;
 * `null` is let through so the service can answer 400 (an element never
 * changes depth). `responsibleCarnets` omitted means unchanged; `[]` clears.
 * No `id`, `portfolioId`, `levelId`, or staff name/email (400 via
 * `forbidNonWhitelisted`).
 */
export class UpdateFrameworkElementDto {
  @ApiPropertyOptional({ type: String, maxLength: CODE_MAX_LENGTH })
  @Transform(trim)
  @ValidateIf(present)
  @IsString()
  @IsNotEmpty()
  @MaxLength(CODE_MAX_LENGTH)
  code?: string;

  @ApiPropertyOptional({ type: String, maxLength: NAME_MAX_LENGTH })
  @Transform(trim)
  @ValidateIf(present)
  @IsString()
  @IsNotEmpty()
  @MaxLength(NAME_MAX_LENGTH)
  name?: string;

  @ApiPropertyOptional({ type: String, nullable: true })
  @Transform(trim)
  @ValidateIf(
    (_object: unknown, value: unknown) => value !== undefined && value !== null,
  )
  @IsString()
  description?: string | null;

  @ApiPropertyOptional({
    type: Number,
    nullable: true,
    description:
      'Omitted = no move. A number moves within the same depth and portfolio. null is rejected by the service.',
  })
  @ValidateIf(
    (_object: unknown, value: unknown) => value !== undefined && value !== null,
  )
  @IsInt()
  @Min(1)
  parentId?: number | null;

  @ApiPropertyOptional({
    type: [String],
    description: 'Replaces the whole list. Omitted = unchanged, [] = clear.',
  })
  @Transform(({ value }) =>
    Array.isArray(value)
      ? value.map((item) => (typeof item === 'string' ? item.trim() : item))
      : value,
  )
  @ValidateIf(present)
  @IsArray()
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  @MaxLength(10, { each: true })
  responsibleCarnets?: string[];
}
