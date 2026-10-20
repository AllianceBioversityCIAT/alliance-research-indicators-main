// Request bodies for the My PI Delegates Excel exports (one per tab).
//
// The client applies its filters locally and sends the resulting keys IN
// DISPLAY ORDER; the server re-fetches through the authorized service reads and
// keeps only those keys. `filters` is descriptive only (banner subtitle).
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { PiDelegateScopeEnum } from '../enum/pi-delegate-scope.enum';

export const PI_DELEGATES_EXPORT_MAX_KEYS = 10000;

export const PI_DELEGATES_EXPORT_ROLE_FILTERS = ['all', 'pi', 'delegate'];

export class ExportByProjectFiltersDto {
  @ApiPropertyOptional({ type: String, example: 'abc' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  search?: string;

  @ApiPropertyOptional({ enum: PI_DELEGATES_EXPORT_ROLE_FILTERS })
  @IsOptional()
  @IsEnum(PI_DELEGATES_EXPORT_ROLE_FILTERS)
  role?: 'all' | 'pi' | 'delegate';

  @ApiPropertyOptional({ type: Boolean })
  @IsOptional()
  @IsBoolean()
  ongoing_w3_bilateral_only?: boolean;

  @ApiPropertyOptional({ type: Boolean })
  @IsOptional()
  @IsBoolean()
  without_delegates_only?: boolean;
}

export class ExportByPersonFiltersDto {
  @ApiPropertyOptional({ type: String, example: 'abc' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  search?: string;
}

class ExportBaseDto {
  @ApiProperty({
    type: Number,
    description: 'sec_users.sec_user_id whose managed data is exported',
    example: 42,
  })
  @Type(() => Number)
  @IsInt()
  @IsNotEmpty()
  user_id!: number;

  @ApiPropertyOptional({
    enum: PiDelegateScopeEnum,
    default: PiDelegateScopeEnum.MANAGED,
    description:
      "'all' is reserved for SYSTEM_ADMIN and CENTER_ADMIN (403 otherwise).",
  })
  @IsOptional()
  @IsEnum(PiDelegateScopeEnum)
  scope?: PiDelegateScopeEnum;
}

export class ExportByProjectDto extends ExportBaseDto {
  @ApiProperty({
    type: [String],
    description:
      'Project codes to export, in display order. Codes outside the caller authorized set are dropped.',
  })
  @IsArray()
  @ArrayMaxSize(PI_DELEGATES_EXPORT_MAX_KEYS)
  @IsString({ each: true })
  project_codes!: string[];

  @ApiPropertyOptional({ type: ExportByProjectFiltersDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => ExportByProjectFiltersDto)
  filters?: ExportByProjectFiltersDto;
}

export class ExportByPersonDto extends ExportBaseDto {
  @ApiProperty({
    type: [Number],
    description:
      'Delegate user ids to export, in display order. Ids outside the caller authorized set are dropped.',
  })
  @IsArray()
  @ArrayMaxSize(PI_DELEGATES_EXPORT_MAX_KEYS)
  @Type(() => Number)
  @IsInt({ each: true })
  delegate_user_ids!: number[];

  @ApiPropertyOptional({ type: ExportByPersonFiltersDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => ExportByPersonFiltersDto)
  filters?: ExportByPersonFiltersDto;
}
