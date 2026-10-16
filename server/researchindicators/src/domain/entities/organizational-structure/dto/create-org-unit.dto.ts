import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

/**
 * B9 body (design 4, 5.2). Deliberately NO `id`, `portfolioId`,
 * `directorName`, `directorEmail` or any delegate name/email field: the
 * handler's `ValidationPipe({ whitelist, forbidNonWhitelisted })` answers 400
 * to each (R-ORG-001, 002, 016, 017). The staff references are `carnet`s only.
 * Rules that need data (level list, staff existence, hierarchy, delegates)
 * live in `OrgStructureService`, because they name a field in the 400.
 */
export class CreateOrgUnitDto {
  @ApiPropertyOptional({
    type: String,
    maxLength: 30,
    description:
      'Entry code. Omit (or send blank) to take the proposed next ORG-### (B3). Unique across all entries, case-insensitive',
  })
  @Transform(({ value }) => {
    const trimmed = trim({ value });
    return trimmed === '' ? undefined : trimmed;
  })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  code?: string;

  @ApiProperty({
    type: Number,
    description: 'org.level control-list value id (20 L1, 21 L2, 22 L3, 23 L4)',
    example: 23,
  })
  @IsInt()
  levelId!: number;

  @ApiProperty({ type: String, maxLength: 255, example: 'Data & AI' })
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name!: string;

  @ApiPropertyOptional({ type: String, maxLength: 50, nullable: true })
  @Transform(trim)
  @IsOptional()
  @IsString()
  @MaxLength(50)
  acronym?: string | null;

  @ApiPropertyOptional({
    type: Number,
    nullable: true,
    description: 'Parent entry id. Required below L1, forbidden for L1',
  })
  @IsOptional()
  @IsInt()
  parentId?: number | null;

  @ApiPropertyOptional({
    type: String,
    nullable: true,
    maxLength: 10,
    description: 'Staff carnet of the responsible director (R-ORG-016)',
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(10)
  directorCarnet?: string | null;

  @ApiPropertyOptional({
    type: [String],
    description:
      'Whole list of delegate carnets (R-ORG-017): at most 20, no duplicates, never the director',
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  @MaxLength(10, { each: true })
  delegateCarnets?: string[];

  @ApiProperty({
    type: Number,
    description: 'First year the entry exists (2000 to current year + 10)',
    example: 2026,
  })
  @IsInt()
  appliesFromYear!: number;

  @ApiPropertyOptional({
    type: Boolean,
    description:
      'Must be true when appliesFromYear is earlier than the current year (R-ORG-005)',
  })
  @IsOptional()
  @IsBoolean()
  backdate?: boolean;
}
