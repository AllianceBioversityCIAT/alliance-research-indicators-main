import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  ArrayUnique,
  IsArray,
  IsInt,
  IsNotEmpty,
  IsString,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';
import { CODE_MAX_LENGTH } from '../strategy-framework.constants';

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

const present = (_object: unknown, value: unknown) => value !== undefined;

/**
 * A10 update body. Every field is optional. `elementIds` omitted means the
 * links stay; `[]` clears them. No `portfolioId`, owner, or responsible
 * (400 via `forbidNonWhitelisted`).
 */
export class UpdateInstitutionalObjectiveDto {
  @ApiPropertyOptional({ type: Number, example: 2027 })
  @ValidateIf(present)
  @IsInt()
  @Min(1)
  year?: number;

  @ApiPropertyOptional({ type: String, maxLength: CODE_MAX_LENGTH })
  @Transform(trim)
  @ValidateIf(present)
  @IsString()
  @IsNotEmpty()
  @MaxLength(CODE_MAX_LENGTH)
  code?: string;

  @ApiPropertyOptional({ type: String })
  @Transform(trim)
  @ValidateIf(present)
  @IsString()
  @IsNotEmpty()
  statement?: string;

  @ApiPropertyOptional({
    type: [Number],
    description:
      'Replaces the linked indicators. Omitted = unchanged, [] = clear.',
  })
  @ValidateIf(present)
  @IsArray()
  @ArrayUnique()
  @IsInt({ each: true })
  @Min(1, { each: true })
  elementIds?: number[];
}
