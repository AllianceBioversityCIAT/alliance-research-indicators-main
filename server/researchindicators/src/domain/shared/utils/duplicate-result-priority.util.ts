/**
 * Cross-platform duplicate resolution for PRMS, TIP, and AICCRA results.
 *
 * All three platforms persist rows in the same `results` table, distinguished
 * only by `platform_code`. When rows share the same normalized `public_link`
 * this module decides which one prevails. `external_link` is never used — it
 * points at the source platform portal and never matches across platforms.
 *
 * Business rules (approved acceptance criteria):
 *
 *  Rule 1 — TIP default priority (AC.2)
 *    If the same public link exists in TIP and in PRMS or AICCRA, TIP prevails.
 *
 *  Rule 2 — AICCRA over PRMS (AC.3)
 *    If the same public link exists in PRMS and AICCRA and TIP is not part of
 *    the comparison, AICCRA prevails.
 *
 *  Rule 3 — AICCRA Capacity Sharing over a Knowledge Product (AC.1)
 *    An AICCRA Capacity Sharing for Development row prevails over a PRMS or TIP
 *    row **whose indicator is Knowledge Product**. Scoped to Knowledge Product
 *    per OQ-1; an earlier implementation applied it to any PRMS/TIP indicator,
 *    which deleted rows no approved rule authorized.
 *
 *  Rule 4 — same-system duplicates are never corrected (R-RES-005)
 *    Two rows of the same `platform_code` are not comparable. The rules
 *    arbitrate *between* systems and are silent *within* one.
 *
 * ---------------------------------------------------------------------------
 * Why resolution is group-level and gated
 *
 * Rules are applied **pairwise**, and a rule decides only the two rows it
 * names. Two earlier revisions applied a rule condition satisfied by one row to
 * a row that condition never compared, and each hard-deleted a protected row.
 *
 * Deciding the group then needs two gates, because the approved criteria do not
 * define a total order over every composition:
 *
 *  Gate A (R-RES-005) — a losing row that shares a platform with a survivor
 *    cannot be deleted. Doing so would "correct" a same-system duplicate.
 *
 *  Gate B (consistency) — no deletable row may beat a row that is being kept.
 *    Deleting X while keeping Y when an approved rule says X prevails over Y is
 *    a contradiction, so the whole group is reported instead.
 *
 * Note that "wins one pair and loses another" is NOT a contradiction: it is the
 * normal position of the middle element of a total order. In
 * `{AICCRA CS, PRMS KP, TIP KP}` the order AICCRA > TIP > PRMS is consistent and
 * fully resolvable, and a gate keyed on win-and-lose would wrongly refuse it.
 *
 * The composition that genuinely contradicts is
 * `{AICCRA CS, TIP KP, TIP non-KP}`: Rule 3 gives AICCRA the win over TIP KP
 * while Rule 1 gives TIP non-KP the win over AICCRA, so keeping the TIP sibling
 * (Gate A) and deleting AICCRA would contradict Rule 3. See OQ-9 — MEL owns the
 * precedence; until then such groups are reported and nothing is deleted.
 */
import { IndicatorsEnum } from '../../entities/indicators/enum/indicators.enum';
import { ReportingPlatformEnum } from '../../entities/results/enum/reporting-platform.enum';

/** Platforms that participate in public-link deduplication. STAR is out of scope. */
export const DUPLICATE_RESULT_PLATFORMS = [
  ReportingPlatformEnum.PRMS,
  ReportingPlatformEnum.TIP,
  ReportingPlatformEnum.AICCRA,
] as const;

/** Minimal identity used to compare two results for priority resolution. */
export type DuplicateResultParticipant = {
  platformCode: ReportingPlatformEnum;
  indicatorId: IndicatorsEnum;
};

/**
 * A row taking part in group resolution.
 *
 * `resultId` is `null` for a prospective incoming sync row that has no stored
 * row yet. When the incoming payload updates an existing row, the two are ONE
 * participant carrying the stored `resultId` and the incoming platform/indicator
 * — counting them separately fires the same-platform branch on every routine
 * re-sync.
 */
export type DuplicateGroupParticipant = DuplicateResultParticipant & {
  resultId: number | null;
  reportYearId?: number | null;
};

/** Which approved rule decided a comparison. */
export enum DuplicateRule {
  RULE_1_TIP = 'RULE_1_TIP',
  RULE_2_AICCRA = 'RULE_2_AICCRA',
  RULE_3_AICCRA_CS_OVER_KP = 'RULE_3_AICCRA_CS_OVER_KP',
  NONE = 'NONE',
}

/** Outcome class for a duplicate group. */
export enum DuplicateGroupClassification {
  /** A winner was found and at least one row may be deleted. */
  RESOLVED = 'RESOLVED',
  /** Fewer than two comparable rows, or no cross-platform pair at all. */
  NO_CONFLICT = 'NO_CONFLICT',
  /** Every row belongs to one platform — out of scope by R-RES-005. */
  SAME_SYSTEM_IGNORED = 'SAME_SYSTEM_IGNORED',
  /** The approved rules contradict each other here. Report, delete nothing. */
  UNRESOLVED_CONFLICT = 'UNRESOLVED_CONFLICT',
  /** Rows span report years. Reported for review, never auto-deleted. */
  CROSS_YEAR_REVIEW = 'CROSS_YEAR_REVIEW',
}

export type DuplicateGroupResolution = {
  classification: DuplicateGroupClassification;
  /** The single prevailing row, or `null` when there is no unique winner. */
  winner: DuplicateGroupParticipant | null;
  /**
   * The complete partition is `losers` ⊎ `untouched` — disjoint, and together
   * every participant exactly once. Callers delete `losers` and keep `untouched`.
   */
  losers: DuplicateGroupParticipant[];
  /** Every row that is kept: survivors plus anything Gate A blocked. */
  untouched: DuplicateGroupParticipant[];
  /**
   * Informational subset of `untouched`: the rows that lose no pair. Not part of
   * the partition — use `untouched` to decide what to keep.
   */
  survivors: DuplicateGroupParticipant[];
  /** The most specific rule the winner won by. */
  rule: DuplicateRule;
  /** `resultId` of the row that satisfied the deciding rule (the winner). */
  decidedBy: number | null;
  /** Human-readable reason, populated for conflicts and no-ops. */
  reason?: string;
};

const isAiccraCapacitySharing = (p: DuplicateResultParticipant) =>
  p.platformCode === ReportingPlatformEnum.AICCRA &&
  p.indicatorId === IndicatorsEnum.CAPACITY_SHARING_FOR_DEVELOPMENT;

const isExternalKnowledgeProduct = (p: DuplicateResultParticipant) =>
  (p.platformCode === ReportingPlatformEnum.PRMS ||
    p.platformCode === ReportingPlatformEnum.TIP) &&
  p.indicatorId === IndicatorsEnum.KNOWLEDGE_PRODUCT;

/** Rule specificity, used when a winner won several pairs by different rules. */
const RULE_SPECIFICITY: Record<DuplicateRule, number> = {
  [DuplicateRule.RULE_3_AICCRA_CS_OVER_KP]: 3,
  [DuplicateRule.RULE_1_TIP]: 2,
  [DuplicateRule.RULE_2_AICCRA]: 1,
  [DuplicateRule.NONE]: 0,
};

/**
 * Decides one pair, applying rules from most specific to most general.
 *
 * @returns `null` when the pair is not comparable (same platform), otherwise
 *          which side prevails and by which rule.
 */
export function resolveDuplicatePair(
  left: DuplicateResultParticipant,
  right: DuplicateResultParticipant,
): { winner: 'left' | 'right'; rule: DuplicateRule } | null {
  // Rule 4: the rules are silent within one platform.
  if (left.platformCode === right.platformCode) return null;

  // Rule 3: AICCRA Capacity Sharing beats a PRMS/TIP Knowledge Product only.
  if (isAiccraCapacitySharing(left) && isExternalKnowledgeProduct(right)) {
    return { winner: 'left', rule: DuplicateRule.RULE_3_AICCRA_CS_OVER_KP };
  }
  if (isAiccraCapacitySharing(right) && isExternalKnowledgeProduct(left)) {
    return { winner: 'right', rule: DuplicateRule.RULE_3_AICCRA_CS_OVER_KP };
  }

  // Rule 1: TIP beats any other platform.
  if (left.platformCode === ReportingPlatformEnum.TIP) {
    return { winner: 'left', rule: DuplicateRule.RULE_1_TIP };
  }
  if (right.platformCode === ReportingPlatformEnum.TIP) {
    return { winner: 'right', rule: DuplicateRule.RULE_1_TIP };
  }

  // Rule 2: AICCRA beats PRMS when TIP is not involved.
  if (
    left.platformCode === ReportingPlatformEnum.AICCRA &&
    right.platformCode === ReportingPlatformEnum.PRMS
  ) {
    return { winner: 'left', rule: DuplicateRule.RULE_2_AICCRA };
  }
  if (
    right.platformCode === ReportingPlatformEnum.AICCRA &&
    left.platformCode === ReportingPlatformEnum.PRMS
  ) {
    return { winner: 'right', rule: DuplicateRule.RULE_2_AICCRA };
  }

  return null;
}

/**
 * Resolves a whole duplicate group.
 *
 * Reads only `platformCode`/`indicatorId` per participant and never "who is
 * incoming", so the outcome is independent of participant order (R-RES-002 AC.7).
 *
 * @param participants Rows sharing one normalized public link. Callers MUST
 *        already have filtered to live, non-snapshot, in-scope-platform rows.
 * @param options.flagCrossYear When true (the sweep), a group spanning more than
 *        one `reportYearId` is reported for review instead of resolved. The sync
 *        path leaves it false because it matches within a single report year.
 */
export function resolveDuplicateGroup(
  participants: DuplicateGroupParticipant[],
  options: { flagCrossYear?: boolean } = {},
): DuplicateGroupResolution {
  const none = (
    classification: DuplicateGroupClassification,
    reason: string,
  ): DuplicateGroupResolution => ({
    classification,
    winner: null,
    survivors: [...participants],
    losers: [],
    untouched: [...participants],
    rule: DuplicateRule.NONE,
    decidedBy: null,
    reason,
  });

  if (participants.length < 2) {
    return none(
      DuplicateGroupClassification.NO_CONFLICT,
      'Fewer than two participants.',
    );
  }

  const platforms = new Set(participants.map((p) => p.platformCode));
  if (platforms.size === 1) {
    return none(
      DuplicateGroupClassification.SAME_SYSTEM_IGNORED,
      'All participants belong to one platform; same-system duplicates are not corrected.',
    );
  }

  if (options.flagCrossYear) {
    const years = new Set(
      participants
        .map((p) => p.reportYearId)
        .filter((y) => y !== null && y !== undefined),
    );
    if (years.size > 1) {
      return none(
        DuplicateGroupClassification.CROSS_YEAR_REVIEW,
        `Participants span ${years.size} report years; auto-deletion is confined to a single year.`,
      );
    }
  }

  // --- pairwise evaluation -------------------------------------------------
  const losses = participants.map(() => 0);
  const beats: Set<number>[] = participants.map(() => new Set<number>());
  const wonBy: DuplicateRule[][] = participants.map(() => []);

  for (let i = 0; i < participants.length; i++) {
    for (let j = i + 1; j < participants.length; j++) {
      const outcome = resolveDuplicatePair(participants[i], participants[j]);
      if (!outcome) continue;
      const winnerIdx = outcome.winner === 'left' ? i : j;
      const loserIdx = outcome.winner === 'left' ? j : i;
      losses[loserIdx] += 1;
      beats[winnerIdx].add(loserIdx);
      wonBy[winnerIdx].push(outcome.rule);
    }
  }

  const survivorIdx = participants
    .map((_, i) => i)
    .filter((i) => losses[i] === 0);
  const losingIdx = participants.map((_, i) => i).filter((i) => losses[i] > 0);

  if (losingIdx.length === 0) {
    return none(
      DuplicateGroupClassification.NO_CONFLICT,
      'No rule decided any pair in this group.',
    );
  }

  // Safety net: with the current rules every cross-platform pair is decided, so
  // survivors cannot span platforms. Kept so a future rule change surfaces as a
  // report rather than as arbitrary deletion.
  const survivorPlatforms = new Set(
    survivorIdx.map((i) => participants[i].platformCode),
  );
  if (survivorPlatforms.size > 1) {
    return none(
      DuplicateGroupClassification.UNRESOLVED_CONFLICT,
      'More than one platform loses no pair; the rules did not decide a cross-platform comparison.',
    );
  }

  // Gate A (R-RES-005) — a loser sharing a platform with a survivor is untouchable.
  const blockedIdx = losingIdx.filter((i) =>
    survivorPlatforms.has(participants[i].platformCode),
  );
  const keptIdx = new Set([...survivorIdx, ...blockedIdx]);
  const deletableIdx = losingIdx.filter((i) => !keptIdx.has(i));

  // Gate B (consistency) — no deletable row may beat a row that is kept.
  const contradiction = deletableIdx.find((i) =>
    [...beats[i]].some((j) => keptIdx.has(j)),
  );
  if (contradiction !== undefined) {
    const beaten = [...beats[contradiction]].filter((j) => keptIdx.has(j));
    return none(
      DuplicateGroupClassification.UNRESOLVED_CONFLICT,
      `Result ${participants[contradiction].resultId ?? 'incoming'} would be deleted while it prevails over kept result(s) ` +
        `${beaten.map((j) => participants[j].resultId ?? 'incoming').join(', ')}. The approved rules contradict each other for this composition (OQ-9).`,
    );
  }

  const survivors = survivorIdx.map((i) => participants[i]);
  const losers = deletableIdx.map((i) => participants[i]);
  // Everything kept: the survivors plus the losers Gate A protected.
  const untouched = [...keptIdx].map((i) => participants[i]);

  // A unique winner exists only when exactly one row loses nothing. Several
  // same-platform survivors are a same-system ambiguity: they are all kept, and
  // a cross-platform row that lost to them is still deleted.
  const winnerIdx = survivorIdx.length === 1 ? survivorIdx[0] : null;
  const rule =
    winnerIdx !== null && wonBy[winnerIdx].length
      ? wonBy[winnerIdx].reduce((a, b) =>
          RULE_SPECIFICITY[b] > RULE_SPECIFICITY[a] ? b : a,
        )
      : DuplicateRule.NONE;

  return {
    classification: DuplicateGroupClassification.RESOLVED,
    winner: winnerIdx !== null ? participants[winnerIdx] : null,
    survivors,
    losers,
    untouched,
    rule,
    decidedBy: winnerIdx !== null ? participants[winnerIdx].resultId : null,
    reason:
      winnerIdx === null
        ? 'Several same-platform rows lose no pair; all survivors are kept and cross-platform losers are still resolved.'
        : undefined,
  };
}

// ---------------------------------------------------------------------------
// Legacy pairwise API
//
// Retained so `SaveResultService` keeps compiling until T-06 reworks it onto
// `resolveDuplicateGroup`. Prefer the group resolver for new code: these two
// functions cannot express Gate A or Gate B, which is why the group-level API
// exists.
// ---------------------------------------------------------------------------

/**
 * Outcome of a duplicate check for a single incoming result.
 *
 * @deprecated Use {@link resolveDuplicateGroup}.
 */
export type DuplicateResultValidationResult = {
  shouldOmit: boolean;
  resultsToDelete: number[];
  protectedFromDeletion: number[];
};

/**
 * Resolves which of two results prevails when they share a public link.
 *
 * @deprecated Use {@link resolveDuplicatePair}, which also reports the rule.
 */
export function resolveDuplicateWinner(
  incoming: DuplicateResultParticipant,
  existing: DuplicateResultParticipant,
): 'incoming' | 'existing' {
  const outcome = resolveDuplicatePair(incoming, existing);
  // Not comparable (same platform) means the sync may proceed.
  if (!outcome) return 'incoming';
  return outcome.winner === 'left' ? 'incoming' : 'existing';
}

/**
 * Aggregates priority decisions for one incoming row against stored duplicates.
 *
 * Now a thin adapter over {@link resolveDuplicateGroup}, so it inherits Gate A
 * and Gate B: a contradictory composition yields no omission and no deletions
 * rather than destroying a protected row.
 *
 * @deprecated Use {@link resolveDuplicateGroup}.
 */
export function evaluateDuplicateResults(
  incoming: DuplicateResultParticipant,
  duplicates: Array<DuplicateResultParticipant & { resultId: number }>,
  protectedResultIds: number[] = [],
): DuplicateResultValidationResult {
  const incomingParticipant: DuplicateGroupParticipant = {
    ...incoming,
    resultId: null,
  };
  const resolution = resolveDuplicateGroup([
    incomingParticipant,
    ...duplicates.map((d) => ({ ...d, resultId: d.resultId })),
  ]);

  const protectedSet = new Set(protectedResultIds);
  const shouldOmit = resolution.losers.some((l) => l.resultId === null);
  const storedLosers = resolution.losers
    .map((l) => l.resultId)
    .filter((id): id is number => id !== null);

  return {
    shouldOmit,
    resultsToDelete: storedLosers.filter((id) => !protectedSet.has(id)),
    protectedFromDeletion: storedLosers.filter((id) => protectedSet.has(id)),
  };
}

/**
 * Normalizes a public link before comparison.
 *
 * NOTE: this is the legacy trim-only normalizer, retained for the current
 * `SaveResultService`. T-04 owns the real normalization, applied symmetrically
 * to both sides inside `DuplicateCandidateRepository` with an explicit binary
 * collation — `results.public_link` is `utf8mb3_general_ci`, which folds case
 * and accents and would otherwise make R-RES-001 AC.2 unsatisfiable.
 */
export function normalizePublicLink(link?: string | null): string | null {
  const normalized = link?.trim();
  return normalized ? normalized : null;
}
