import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { PfmChipEnum } from '../enum/pfm-chip.enum';
import { PfmScopeEnum } from '../enum/pfm-scope.enum';
import { PfmStatusFilterEnum } from '../enum/pfm-status-filter.enum';

// @akili-spec docs/specs/bilateral/prms-sync/pooled-funding-monitor — T-05

/** `GET /pooled-funding-monitor/summary`. Never carries a user id (NFR-PFM-001). */
export class PfmSummaryQueryDto {
  @ApiPropertyOptional({
    enum: PfmScopeEnum,
    default: PfmScopeEnum.MINE,
    description:
      "'mine' (default) = only results of projects the authenticated user leads or is an active delegate of; 'all' = whole portfolio.",
  })
  @IsOptional()
  @IsEnum(PfmScopeEnum)
  scope?: PfmScopeEnum;
}

/** `GET /pooled-funding-monitor/queue` and `.../queue/projects/:projectCode/results`. */
export class PfmQueueQueryDto extends PfmSummaryQueryDto {
  @ApiPropertyOptional({ description: 'AGRESSO project code (exact match).' })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  project?: string;

  @ApiPropertyOptional({
    description:
      'Science program code; matches the primary OR a contributing SP.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  sp?: string;

  @ApiPropertyOptional({ enum: PfmStatusFilterEnum })
  @IsOptional()
  @IsEnum(PfmStatusFilterEnum)
  status?: PfmStatusFilterEnum;

  @ApiPropertyOptional({
    type: Number,
    description: 'Result type = indicator id (1, 2, 3, 4 or 6).',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  type?: number;

  @ApiPropertyOptional({ enum: PfmChipEnum })
  @IsOptional()
  @IsEnum(PfmChipEnum)
  chip?: PfmChipEnum;
}

export class PfmProjectParamDto {
  @ApiProperty({ description: 'AGRESSO project code.' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  projectCode!: string;
}
