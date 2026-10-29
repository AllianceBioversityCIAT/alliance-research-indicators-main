import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// @akili-spec docs/specs/bilateral/annualized-project-mapping — T-05 /
// design.md §5, DD-7. R-APM-003.
//
// The run report keeps the existing envelope (feedFetchedAt, counts,
// ambiguous, unresolved) and replaces the supersede bucket with toUpdate
// and inactive. Apply derives its candidate set by calling
// AutomapperService.resolve() itself. This request class stays empty so
// forbidNonWhitelisted rejects any caller-supplied field, including a year
// or a candidate list. Accepting a candidate list would bypass the
// AGRESSO-existence confirmation.

export class AutomapperRunRequestDto {}

export class AutomapperCoverageQueryDto {}

// Output-only shapes — mirror the service interfaces field-for-field.
// Declared as classes so @nestjs/swagger can generate a schema. Nothing
// here is deserialized from a request.
export class AutomapperCandidateDto {
  @ApiProperty() clarisaProjectId!: number;
  @ApiProperty({ nullable: true }) clarisaProjectFullName!: string | null;
  @ApiProperty({ nullable: true }) clarisaProjectShortName!: string | null;
  @ApiProperty({ nullable: true }) externalCode!: string | null;
  @ApiProperty() derivedContractId!: string;
}

export class AutomapperReconciledEntryDto extends AutomapperCandidateDto {
  @ApiProperty({
    enum: ['alreadyMapped', 'divergent', 'toUpdate'],
  })
  action!: 'alreadyMapped' | 'divergent' | 'toUpdate';

  @ApiProperty() existingMappingId!: number;
  @ApiProperty() existingClarisaProjectId!: number;
}

export class AutomapperInactiveEntryDto extends AutomapperCandidateDto {
  @ApiProperty({ enum: ['inactive'] })
  action!: 'inactive';

  @ApiProperty() existingMappingId!: number;
  @ApiProperty() existingClarisaProjectId!: number;
  @ApiProperty({
    description:
      'True when Apply rewrote this inactive row CLARISA fields in place.',
  })
  refreshed!: boolean;
}

export class AutomapperToCreateEntryDto extends AutomapperCandidateDto {
  @ApiProperty({ enum: ['toCreate'] })
  action!: 'toCreate';
}

export class AutomapperPreviewCountsDto {
  @ApiProperty() toCreate!: number;
  @ApiProperty() alreadyMapped!: number;
  @ApiProperty() toUpdate!: number;
  @ApiProperty() ambiguous!: number;
  @ApiProperty() unresolved!: number;
  @ApiProperty() divergent!: number;
  @ApiProperty() inactive!: number;
}

export class AutomapperPreviewResponseDto {
  @ApiProperty({ description: 'Reporting year resolved once for this run.' })
  reporting_year!: number;

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

  @ApiProperty({ type: [AutomapperReconciledEntryDto] })
  toUpdate!: AutomapperReconciledEntryDto[];

  @ApiProperty({ type: [AutomapperCandidateDto] })
  ambiguous!: AutomapperCandidateDto[];

  @ApiProperty({ type: [AutomapperCandidateDto] })
  unresolved!: AutomapperCandidateDto[];

  @ApiProperty({ type: [AutomapperReconciledEntryDto] })
  divergent!: AutomapperReconciledEntryDto[];

  @ApiProperty({ type: [AutomapperInactiveEntryDto] })
  inactive!: AutomapperInactiveEntryDto[];
}

export class AutomapperApplyCountsDto {
  @ApiProperty() created!: number;
  @ApiProperty() updated!: number;
  @ApiProperty() alreadyMapped!: number;
  @ApiProperty() ambiguous!: number;
  @ApiProperty() unresolved!: number;
  @ApiProperty() divergent!: number;
  @ApiProperty() inactive!: number;
}

// apply() re-runs classification against CURRENT state inside its own
// transaction rather than trusting a caller-supplied classification.
export class AutomapperApplyResponseDto {
  @ApiProperty({ description: 'Reporting year resolved once for this run.' })
  reporting_year!: number;

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
  @ApiProperty() reporting_year!: number;
  @ApiProperty() mapped!: number;
  @ApiProperty() pending!: number;
  @ApiProperty() inactive!: number;
  @ApiProperty() reachable!: number;
}
