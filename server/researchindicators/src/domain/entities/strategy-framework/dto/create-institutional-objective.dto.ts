import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  ArrayUnique,
  IsArray,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { CODE_MAX_LENGTH } from '../strategy-framework.constants';

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

/**
 * A10 create body. No owner and no responsible (R-STF-009 AC.2):
 * `forbidNonWhitelisted` answers 400. A blank `code` means "propose IOB-n".
 */
export class CreateInstitutionalObjectiveDto {
  @ApiProperty({ type: Number, example: 2 })
  @IsInt()
  @Min(1)
  portfolioId!: number;

  @ApiProperty({ type: Number, example: 2026 })
  @IsInt()
  @Min(1)
  year!: number;

  @ApiPropertyOptional({ type: String, maxLength: CODE_MAX_LENGTH })
  @Transform(({ value }) => {
    const trimmed = trim({ value });
    return trimmed === '' ? undefined : trimmed;
  })
  @IsOptional()
  @IsString()
  @MaxLength(CODE_MAX_LENGTH)
  code?: string;

  @ApiProperty({ type: String, example: 'Improve process efficiency' })
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  statement!: string;

  @ApiPropertyOptional({
    type: [Number],
    description:
      'Indicator-level elements of this portfolio. Omitted or empty stores no links.',
  })
  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsInt({ each: true })
  @Min(1, { each: true })
  elementIds?: number[];
}
