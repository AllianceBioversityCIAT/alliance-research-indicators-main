import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  ValidateIf,
} from 'class-validator';

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;
const present = (_: unknown, value: unknown) => value !== undefined;
const presentNotNull = (_: unknown, value: unknown) =>
  value !== undefined && value !== null;

/**
 * B10 body (design 4, 5.2). Every field is optional: an omitted field is left
 * as it is. `null` clears `acronym`, `parentId` and `directorCarnet`. Like
 * B9 there is no `id`, `portfolioId`, director name/email or delegate
 * name/email (400 through `forbidNonWhitelisted`). `appliesFromYear` is
 * required by the service unless only `code` is sent: delegates are a versioned
 * field like the director (R-ORG-017, D-ORG-24).
 */
export class UpdateOrgUnitDto {
  @ApiPropertyOptional({ type: String, maxLength: 30 })
  @Transform(trim)
  @ValidateIf(present)
  @IsString()
  @IsNotEmpty()
  @MaxLength(30)
  code?: string;

  @ApiPropertyOptional({
    type: Number,
    description: 'org.level value id (20-23)',
  })
  @ValidateIf(present)
  @IsInt()
  levelId?: number;

  @ApiPropertyOptional({ type: String, maxLength: 255 })
  @Transform(trim)
  @ValidateIf(present)
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name?: string;

  @ApiPropertyOptional({ type: String, maxLength: 50, nullable: true })
  @Transform(trim)
  @ValidateIf(presentNotNull)
  @IsString()
  @MaxLength(50)
  acronym?: string | null;

  @ApiPropertyOptional({ type: Number, nullable: true })
  @ValidateIf(presentNotNull)
  @IsInt()
  parentId?: number | null;

  @ApiPropertyOptional({ type: String, nullable: true, maxLength: 10 })
  @ValidateIf(presentNotNull)
  @IsString()
  @IsNotEmpty()
  @MaxLength(10)
  directorCarnet?: string | null;

  @ApiPropertyOptional({
    type: [String],
    description:
      'Replaces the whole delegate list of the version at appliesFromYear (a versioned field, so appliesFromYear is required): omitted = unchanged, [] = cleared. Later versions that hold the same set take it too',
  })
  @ValidateIf(present)
  @IsArray()
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  @MaxLength(10, { each: true })
  delegateCarnets?: string[];

  @ApiPropertyOptional({
    type: Number,
    description:
      'Year the versioned change applies from. Required unless only code is sent (delegateCarnets needs it like directorCarnet)',
  })
  @IsOptional()
  @IsInt()
  appliesFromYear?: number;

  @ApiPropertyOptional({ type: Boolean })
  @IsOptional()
  @IsBoolean()
  backdate?: boolean;
}
