// @sdd-spec results/cross-platform-duplicate-resolution
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsEnum,
  IsInt,
  IsOptional,
  IsPositive,
  IsString,
  Length,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ReportingPlatformEnum } from '../enum/reporting-platform.enum';
import { IndicatorsEnum } from '../../indicators/enum/indicators.enum';

/** Whether the run produced a usable answer. */
export enum DuplicateResolutionStatus {
  OK = 'OK',
  /**
   * The scan found nothing. Reported explicitly because a run that found nothing
   * has not proved nothing is there — the filter may simply be wrong, and a bare
   * success would be indistinguishable from a clean database.
   */
  INCONCLUSIVE = 'INCONCLUSIVE',
}

export class DuplicateResolutionFilterDto {
  @ApiPropertyOptional({
    type: Number,
    description:
      'Restrict the scan to one report year. Auto-deletion is confined to a single year regardless; this only narrows the scan.',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  reportYear?: number;

  @ApiPropertyOptional({
    isArray: true,
    enum: ReportingPlatformEnum,
    description: 'Restrict the scan to these platforms.',
  })
  @IsOptional()
  @IsArray()
  @IsEnum(ReportingPlatformEnum, { each: true })
  platform?: ReportingPlatformEnum[];

  @ApiPropertyOptional({
    isArray: true,
    type: Number,
    description: 'Restrict the scan to these indicator ids.',
  })
  @IsOptional()
  @IsArray()
  @Type(() => Number)
  @IsInt({ each: true })
  indicator?: IndicatorsEnum[];

  @ApiPropertyOptional({
    type: Number,
    description:
      'Cap the number of groups scanned. A capped run is reported as such — a truncated scan must never read as full coverage.',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  limit?: number;
}

export class ApplyDuplicateResolutionDto {
  @ApiProperty({
    type: String,
    description: 'The run id returned by the plan endpoint.',
  })
  @IsString()
  @Length(1, 64)
  runId!: string;

  @ApiProperty({
    type: String,
    description:
      'The confirmation digest returned with that plan. Apply is refused if the freshly derived digest differs, because the data moved since the plan was reviewed.',
  })
  @IsString()
  @Length(64, 64)
  confirmationDigest!: string;

  @ApiPropertyOptional({
    type: DuplicateResolutionFilterDto,
    description:
      'The same filter the plan used. A different filter yields a different digest and is refused.',
  })
  @IsOptional()
  filters?: DuplicateResolutionFilterDto;
}

export class DuplicateResolutionPlanGroup {
  @ApiProperty({ type: String })
  groupKey!: string;

  @ApiProperty({ type: String })
  classification!: string;

  @ApiProperty({ type: String })
  rule!: string;

  @ApiProperty({ type: Number, nullable: true })
  winnerResultId!: number | null;

  @ApiProperty({
    type: Number,
    nullable: true,
    description: 'The row that satisfied the deciding rule.',
  })
  decidedBy!: number | null;

  @ApiProperty({ type: [Number] })
  participantResultIds!: (number | null)[];

  @ApiProperty({
    type: [Number],
    description:
      'The FULLY EXPANDED set of result ids that would be deleted, including family members. Seed ids alone would let rows created between plan and apply be deleted without appearing here.',
  })
  toDelete!: number[];

  @ApiProperty({
    type: String,
    nullable: true,
    description:
      'Why a group was not resolved — populated for conflicts and cross-year groups.',
  })
  reason!: string | null;
}

export class DuplicateResolutionPlan {
  @ApiProperty({ type: String })
  runId!: string;

  @ApiProperty({ enum: DuplicateResolutionStatus })
  status!: DuplicateResolutionStatus;

  @ApiProperty({ type: String })
  confirmationDigest!: string;

  @ApiProperty({ type: DuplicateResolutionFilterDto })
  filters!: DuplicateResolutionFilterDto;

  @ApiProperty({ type: Number })
  groupCount!: number;

  @ApiProperty({ type: Number })
  rowsToDelete!: number;

  @ApiProperty({
    type: Object,
    description: 'Group counts per classification.',
  })
  byClassification!: Record<string, number>;

  @ApiProperty({ type: [DuplicateResolutionPlanGroup] })
  groups!: DuplicateResolutionPlanGroup[];

  @ApiPropertyOptional({ type: String })
  message?: string;
}
