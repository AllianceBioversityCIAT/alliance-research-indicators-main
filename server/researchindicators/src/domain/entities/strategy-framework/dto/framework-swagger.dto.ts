import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Swagger models for A1 and A1e (design §4). These classes document the
 * `data` object. They are not the runtime types — those are the interfaces
 * on `FrameworkReadService`.
 *
 * `usageLabels` sits once on the editor view (D-STF-28).
 */

export class FrameworkResponsibleDto {
  @ApiProperty()
  carnet!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty({ nullable: true })
  email!: string | null;

  @ApiProperty()
  isActiveStaff!: boolean;
}

export class FrameworkLevelDto {
  @ApiPropertyOptional({
    description: 'Absent on the empty editor’s virtual levels (A1e).',
  })
  id?: number;

  @ApiProperty()
  depth!: number;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  pluralName!: string;

  @ApiProperty()
  shortLabel!: string;

  @ApiProperty()
  isIndicatorLevel!: boolean;

  @ApiPropertyOptional({
    description: 'True only on the empty editor’s stand-in levels.',
  })
  virtual?: true;
}

export class FrameworkElementDto {
  @ApiProperty()
  id!: number;

  @ApiProperty()
  levelId!: number;

  @ApiProperty()
  depth!: number;

  @ApiProperty()
  code!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty({ nullable: true })
  description!: string | null;

  @ApiProperty({ nullable: true })
  parentId!: number | null;

  @ApiProperty({
    type: 'object',
    additionalProperties: { type: 'number' },
    description: 'Descendant counts keyed by depth.',
  })
  descendantCounts!: Record<number, number>;

  @ApiPropertyOptional({
    type: [FrameworkResponsibleDto],
    description: 'Indicator-level elements only, in position order.',
  })
  responsibles?: FrameworkResponsibleDto[];
}

export class FrameworkBlockerDto {
  @ApiProperty()
  reason!: string;

  @ApiProperty()
  count!: number;

  @ApiProperty()
  wayOut!: string;
}

/** Per-element editor fields. Deliberately has no `usageLabels`. */
export class FrameworkEditorElementDto extends FrameworkElementDto {
  @ApiProperty({
    type: 'object',
    additionalProperties: { type: 'number' },
    description: 'Counts keyed by consumer name. Per element.',
  })
  usage!: Record<string, number>;

  @ApiProperty({ description: 'Per element.' })
  deletable!: boolean;

  @ApiProperty({ type: [FrameworkBlockerDto], description: 'Per element.' })
  blockers!: FrameworkBlockerDto[];
}

export class UsageLabelDto {
  @ApiProperty()
  consumerName!: string;

  @ApiProperty()
  label!: string;
}

export class FrameworkViewDto {
  @ApiProperty()
  portfolioId!: number;

  @ApiProperty()
  configured!: boolean;

  @ApiProperty({ type: [FrameworkLevelDto] })
  levels!: FrameworkLevelDto[];

  @ApiProperty({
    type: [FrameworkElementDto],
    description:
      'Consumer elements. No usage, deletable, blockers or usageLabels.',
  })
  elements!: FrameworkElementDto[];
}

export class FrameworkEditorViewDto {
  @ApiProperty()
  portfolioId!: number;

  @ApiProperty()
  configured!: boolean;

  @ApiProperty({ type: [FrameworkLevelDto] })
  levels!: FrameworkLevelDto[];

  @ApiProperty({ type: [FrameworkEditorElementDto] })
  elements!: FrameworkEditorElementDto[];

  @ApiProperty({
    type: [UsageLabelDto],
    description: 'On the view, once: {consumerName, label}[] (D-STF-28).',
  })
  usageLabels!: UsageLabelDto[];
}

export class CodeProposalDto {
  @ApiProperty({ example: '1.4' })
  code!: string;
}
