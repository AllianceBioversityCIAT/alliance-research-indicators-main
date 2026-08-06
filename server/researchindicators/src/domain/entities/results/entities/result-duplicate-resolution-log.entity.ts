// @sdd-spec results/cross-platform-duplicate-resolution
import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { AuditableEntity } from '../../../shared/global-dto/auditable.entity';

/** Which code path produced the record. */
export enum DuplicateResolutionSource {
  SYNC_TIP = 'SYNC_TIP',
  SYNC_PRMS = 'SYNC_PRMS',
  SWEEP = 'SWEEP',
}

/** Whether the run was allowed to write. */
export enum DuplicateResolutionMode {
  /** The sweep's plan endpoint — zero writes to `results`. */
  DRY_RUN = 'DRY_RUN',
  /** The sweep's apply endpoint. */
  APPLY = 'APPLY',
  /** A sync pipeline resolving inline. */
  SYNC = 'SYNC',
}

/** What happened to one row in the group. */
export enum DuplicateRowOutcome {
  DELETED = 'DELETED',
  /** Retained because something that must survive references it (R-RES-004). */
  PROTECTED = 'PROTECTED',
  /** The delete was attempted and failed; `reason` carries the error. */
  FAILED = 'FAILED',
  /** The routine reported the row was already gone. Never conflated with DELETED. */
  NOOP = 'NOOP',
  /**
   * Deletion was never attempted: the seed's identity has more than one live
   * row, so which live row owns which snapshot is undecidable (T-07 pivot,
   * 2026-08-04 — `version_id` is NULL on every snapshot measured). Refused
   * rather than guessed. Never conflated with NOOP — a NOOP means the routine
   * ran and found nothing; a REFUSED means the routine was never called.
   */
  REFUSED = 'REFUSED',
  /** Planned only — a dry run, or the hard-delete flag was off. */
  PLANNED = 'PLANNED',
  /** The prevailing row; not deleted. */
  WINNER = 'WINNER',
  /** No rule authorized touching it. */
  UNTOUCHED = 'UNTOUCHED',
  /** An incoming sync row that was not created because it lost. */
  OMITTED = 'OMITTED',
}

/** Identifying payload of one participant, captured BEFORE any deletion. */
export type DuplicateParticipantSnapshot = {
  resultId: number | null;
  resultOfficialCode: number | null;
  platformCode: string;
  indicatorId: number | null;
  reportYearId: number | null;
  /**
   * The raw value that produced the identity. Field name kept as
   * `rawPublicLink` for this stored JSON shape even though, for a PRMS
   * participant (T-15, R-RES-010), the value is a `result_evidences.
   * evidence_url` handle, never `public_link` — `identitySource` below is
   * what disambiguates it. Under a hard delete this JSON is the only
   * surviving trace of the deleted row, so it is written before deletion,
   * not derived from it after the fact.
   */
  rawPublicLink: string | null;
  normalizedPublicLink: string | null;
  /**
   * Which field supplied the identity — `PUBLIC_LINK` or `HANDLE_EVIDENCE`
   * (R-RES-009 AC.4). Under a hard delete this is the only way to
   * reconstruct WHY a row was considered a member of its group. `null` only
   * for historical rows written before this field existed.
   */
  identitySource?: string | null;
};

export type DuplicateRowOutcomeRecord = {
  resultId: number | null;
  outcome: DuplicateRowOutcome;
  reason?: string;
  /** Populated for PROTECTED rows: which relationship blocked the delete. */
  protectingRelationships?: unknown[];
  /** Family members the deletion expanded to. */
  expandedResultIds?: number[];
  /** Rows year scoping excluded — the T-07 tripwire. */
  siblingIdsOutsideReportYear?: number[];
};

/**
 * One row per resolved duplicate group per run.
 *
 * This table, not the logs, is the answer to "did it actually delete the
 * duplicates?" — the question that opened this spec. Logs rotate; the question
 * outlived the last three rotations.
 *
 * Under a hard delete the participant payload is the **only surviving trace** of
 * a deleted row, so it is written *before* the deletion is attempted. That is what
 * makes R-RES-003 AC.3 satisfiable and what makes the reversion from soft delete
 * acceptable at all.
 *
 * `winner_result_id`, `deciding_rule` and `deciding_result_id` are nullable
 * **by design**: `UNRESOLVED_CONFLICT` and same-platform-ambiguity groups have no
 * single winner and no deciding row. R-RES-009 AC.1 asks for exactly one traceable
 * record naming the deciding rule; for those groups the `classification` and
 * `reason` are that explanation, and forcing a winner would mean inventing one.
 */
@Entity('result_duplicate_resolution_log')
@Index('idx_rdrl_run_id', ['run_id'])
@Index('idx_rdrl_group_key_hash', ['group_key_hash'])
export class ResultDuplicateResolutionLog extends AuditableEntity {
  @ApiProperty({ type: Number })
  @PrimaryGeneratedColumn({ name: 'id', type: 'bigint' })
  id!: number;

  /** Groups every record written by one run. */
  @ApiProperty({ type: String })
  @Column('varchar', { name: 'run_id', length: 64, nullable: false })
  run_id!: string;

  @ApiProperty({ enum: DuplicateResolutionSource })
  @Column('varchar', { name: 'source', length: 30, nullable: false })
  source!: DuplicateResolutionSource;

  @ApiProperty({ enum: DuplicateResolutionMode })
  @Column('varchar', { name: 'mode', length: 20, nullable: false })
  mode!: DuplicateResolutionMode;

  /**
   * SHA-256 of the normalized link.
   *
   * Indexed instead of the link itself: `public_link` is `TEXT`, so a direct
   * index would need a prefix length and would still risk collisions under the
   * InnoDB key limit. The readable value lives in `normalized_public_link`.
   */
  @ApiProperty({ type: String })
  @Column('char', { name: 'group_key_hash', length: 64, nullable: false })
  group_key_hash!: string;

  @ApiProperty({ type: String })
  @Column('text', { name: 'normalized_public_link', nullable: true })
  normalized_public_link?: string;

  /** Identity of every participant, captured before any deletion. */
  @ApiProperty({ type: Object })
  @Column('json', { name: 'participants', nullable: false })
  participants!: DuplicateParticipantSnapshot[];

  @ApiProperty({ type: String })
  @Column('varchar', { name: 'classification', length: 40, nullable: false })
  classification!: string;

  @ApiProperty({ type: Number, nullable: true })
  @Column('bigint', { name: 'winner_result_id', nullable: true })
  winner_result_id?: number | null;

  @ApiProperty({ type: String, nullable: true })
  @Column('varchar', { name: 'deciding_rule', length: 40, nullable: true })
  deciding_rule?: string | null;

  /** The row that satisfied the deciding rule (R-RES-009 AC.1). */
  @ApiProperty({ type: Number, nullable: true })
  @Column('bigint', { name: 'deciding_result_id', nullable: true })
  deciding_result_id?: number | null;

  @ApiProperty({ type: Object })
  @Column('json', { name: 'outcomes', nullable: true })
  outcomes?: DuplicateRowOutcomeRecord[];

  @ApiProperty({ type: Number })
  @Column('int', { name: 'deleted_count', default: 0 })
  deleted_count!: number;

  @ApiProperty({ type: Number })
  @Column('int', { name: 'protected_count', default: 0 })
  protected_count!: number;

  @ApiProperty({ type: Number })
  @Column('int', { name: 'failed_count', default: 0 })
  failed_count!: number;

  @ApiProperty({ type: Number })
  @Column('int', { name: 'noop_count', default: 0 })
  noop_count!: number;

  /**
   * State of `duplicate_resolution.hard_delete_enabled` at write time.
   *
   * Recorded because the flag's OFF state is "detect and audit, do not delete".
   * Without it, a run that planned deletions and performed none is
   * indistinguishable from one that failed to find anything.
   */
  @ApiProperty({ type: Boolean })
  @Column('boolean', { name: 'hard_delete_enabled', default: false })
  hard_delete_enabled!: boolean;

  /** Digest the operator confirmed, for sweep applies. */
  @ApiProperty({ type: String, nullable: true })
  @Column('varchar', {
    name: 'confirmation_digest',
    length: 64,
    nullable: true,
  })
  confirmation_digest?: string | null;

  /** Why a group was not resolved, or why a row was retained. */
  @ApiProperty({ type: String, nullable: true })
  @Column('text', { name: 'reason', nullable: true })
  reason?: string | null;
}
