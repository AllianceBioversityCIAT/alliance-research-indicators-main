import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsArray,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import {
  CODE_MAX_LENGTH,
  NAME_MAX_LENGTH,
} from '../strategy-framework.constants';

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

/**
 * A5 body. The level is derived from the parent, so there is no `levelId`.
 * A staff name or email property is not a field: `forbidNonWhitelisted`
 * answers 400 (R-STF-004). `code` blank means "propose one".
 */
export class CreateFrameworkElementDto {
  @ApiProperty({ type: Number, example: 2 })
  @IsInt()
  @Min(1)
  portfolioId!: number;

  @ApiPropertyOptional({
    type: Number,
    nullable: true,
    description: 'Absent or null creates a depth-1 element',
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  parentId?: number | null;

  @ApiPropertyOptional({ type: String, maxLength: CODE_MAX_LENGTH })
  @Transform(({ value }) => {
    const trimmed = trim({ value });
    return trimmed === '' ? undefined : trimmed;
  })
  @IsOptional()
  @IsString()
  @MaxLength(CODE_MAX_LENGTH)
  code?: string;

  @ApiProperty({ type: String, maxLength: NAME_MAX_LENGTH, example: 'Crops' })
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(NAME_MAX_LENGTH)
  name!: string;

  @ApiPropertyOptional({ type: String, nullable: true })
  @Transform(trim)
  @IsOptional()
  @IsString()
  description?: string | null;

  @ApiPropertyOptional({
    type: [String],
    description:
      'Staff carnets, indicator level only. Omitted or empty stores none. Order is the stored position.',
  })
  @Transform(({ value }) =>
    Array.isArray(value)
      ? value.map((item) => (typeof item === 'string' ? item.trim() : item))
      : value,
  )
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  @MaxLength(10, { each: true })
  responsibleCarnets?: string[];
}
