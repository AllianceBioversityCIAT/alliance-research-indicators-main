import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional } from 'class-validator';

// @akili-spec docs/specs/bilateral/clarisa-automapper-s2 — T-05 / design.md §4, §7
//
// The run report is the SAME SHAPE for preview and apply (design §4): four
// buckets plus ambiguous/unresolved, each entry carrying external_code,
// derived contract id, full_name and the CLARISA project id (R-5) so the
// review surface never shows a bare number. `feedFetchedAt` states the
// CLARISA cache's fetch timestamp (§7, K-016) — a run right after a feed
// change can still read a cached cohort.
//
// The request body carries `phase` and NOTHING else — no candidate list,
// no "resolved" field. Apply derives `resolved` server-side by calling
// AutomapperService.resolve() itself (T-05 Finding 1 / execution.md T-03
// forward pointer); accepting a candidate list here would let a caller
// bypass R-CAM-001's AGRESSO-existence confirmation entirely.

export class AutomapperRunRequestDto {
  @ApiPropertyOptional({
    description: 'CLARISA phase filter override (e.g. 2026)',
    type: Number,
    example: 2026,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  phase?: number;
}

export class AutomapperCoverageQueryDto {
  @ApiPropertyOptional({
    description: 'CLARISA phase filter override (e.g. 2026)',
    type: Number,
    example: 2026,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  phase?: number;
}

// Output-only shapes — mirror AutomapperCandidate / AutomapperReconciledEntry
// in automapper.service.ts field-for-field. Declared as classes (not the
// service's interfaces) purely so @nestjs/swagger can generate a schema;
// no validation decorators, since nothing here is ever deserialized from a
// request.
export class AutomapperCandidateDto {
  @ApiProperty() clarisaProjectId!: number;
  @ApiProperty({ nullable: true }) clarisaProjectFullName!: string | null;
  @ApiProperty({ nullable: true }) clarisaProjectShortName!: string | null;
  @ApiProperty({ nullable: true }) externalCode!: string | null;
  @ApiProperty() derivedContractId!: string;
}

export class AutomapperReconciledEntryDto extends AutomapperCandidateDto {
  @ApiProperty({
    enum: ['alreadyMapped', 'divergent', 'supersede'],
  })
  action!: 'alreadyMapped' | 'divergent' | 'supersede';

  @ApiProperty() existingMappingId!: number;
  @ApiProperty() existingClarisaProjectId!: number;
}

export class AutomapperToCreateEntryDto extends AutomapperCandidateDto {
  @ApiProperty({ enum: ['toCreate'] })
  action!: 'toCreate';
}

export class AutomapperPreviewCountsDto {
  @ApiProperty() toCreate!: number;
  @ApiProperty() alreadyMapped!: number;
  @ApiProperty() ambiguous!: number;
  @ApiProperty() unresolved!: number;
  @ApiProperty() divergent!: number;
  @ApiProperty() supersede!: number;
}

// R-CAM-002 AC.3's four counts are toCreate/alreadyMapped/ambiguous/
// unresolved; divergent and supersede ride along because R-CAM-003 and
// R-CAM-005 require the divergence/supersession to be surfaced, not just
// counted (T-06 consumes them for the review surface).
export class AutomapperPreviewResponseDto {
  @ApiPropertyOptional({
    nullable: true,
    type: String,
    format: 'date-time',
    description:
      'When the CLARISA project cache was last fetched (5-minute TTL) — not the time of this run.',
  })
  feedFetchedAt!: string | null;

  @ApiProperty({ type: AutomapperPreviewCountsDto })
  counts!: AutomapperPreviewCountsDto;

  @ApiProperty({ type: [AutomapperToCreateEntryDto] })
  toCreate!: AutomapperToCreateEntryDto[];

  @ApiProperty({ type: [AutomapperReconciledEntryDto] })
  alreadyMapped!: AutomapperReconciledEntryDto[];

  @ApiProperty({ type: [AutomapperCandidateDto] })
  ambiguous!: AutomapperCandidateDto[];

  @ApiProperty({ type: [AutomapperCandidateDto] })
  unresolved!: AutomapperCandidateDto[];

  @ApiProperty({ type: [AutomapperReconciledEntryDto] })
  divergent!: AutomapperReconciledEntryDto[];

  @ApiProperty({ type: [AutomapperReconciledEntryDto] })
  supersede!: AutomapperReconciledEntryDto[];
}

export class AutomapperApplyCountsDto {
  @ApiProperty() created!: number;
  @ApiProperty() alreadyMapped!: number;
  @ApiProperty() ambiguous!: number;
  @ApiProperty() unresolved!: number;
  @ApiProperty() divergent!: number;
  @ApiProperty() superseded!: number;
}

// apply() (design §5 step 7) re-runs classification against CURRENT state
// inside its own transaction rather than trusting a caller-supplied
// classification — so only `created`/`alreadyMapped`/`divergent`/
// `superseded` come from the write itself; `ambiguous`/`unresolved` (and
// their entries) come from the same resolve() call the endpoint made to
// derive `resolved` server-side, run immediately before the write.
export class AutomapperApplyResponseDto {
  @ApiPropertyOptional({
    nullable: true,
    type: String,
    format: 'date-time',
    description:
      'When the CLARISA project cache was last fetched (5-minute TTL) — not the time of this run.',
  })
  feedFetchedAt!: string | null;

  @ApiProperty({ type: AutomapperApplyCountsDto })
  counts!: AutomapperApplyCountsDto;

  @ApiProperty({ type: [AutomapperCandidateDto] })
  ambiguous!: AutomapperCandidateDto[];

  @ApiProperty({ type: [AutomapperCandidateDto] })
  unresolved!: AutomapperCandidateDto[];
}

export class AutomapperCoverageResponseDto {
  @ApiProperty() mapped!: number;
  @ApiProperty() pending!: number;
  @ApiProperty() reachable!: number;
}
