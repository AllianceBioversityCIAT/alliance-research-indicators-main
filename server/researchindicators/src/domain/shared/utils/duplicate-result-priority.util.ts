/**
 * Cross-platform duplicate resolution for PRMS, TIP, and AICCRA results.
 *
 * All three platforms persist rows in the same `results` table; they are
 * distinguished only by `platform_code`. When two rows share the same
 * `public_link` (official publication URL), this module decides which one
 * prevails. `external_link` is never used — it is platform-specific.
 *
 * Business rules (acceptance criteria):
 *
 *  Rule 1 — TIP default priority
 *    If the same public link exists in TIP and in PRMS or AICCRA, TIP prevails.
 *    PRMS must not create a result that already exists in TIP.
 *
 *  Rule 2 — AICCRA over PRMS
 *    If the same public link exists in PRMS and AICCRA (and TIP is not involved),
 *    AICCRA prevails. PRMS must not create a result that already exists in AICCRA.
 *
 *  Rule 3 — AICCRA Capacity Sharing exception
 *    When the AICCRA side is Capacity Sharing for Development, AICCRA prevails
 *    over ANY result from PRMS or TIP (any indicator), including TIP Capacity
 *    Sharing and Knowledge Product. This is the only case where TIP does NOT win
 *    by default. The exception applies only when AICCRA is Capacity Sharing —
 *    other AICCRA indicators still follow Rules 1 and 2.
 *
 *  Rule 4 — link_results protection
 *    A duplicate that would normally be deleted must NOT be removed when it is
 *    already referenced as `other_result_id` in `link_results`, because another
 *    result depends on it.
 *
 * Notes:
 *  - AICCRA data is migrated historical data; there is no live AICCRA sync.
 *  - PRMS sync is only allowed to create results that do not already exist in
 *    TIP or AICCRA under the rules above.
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
 * Outcome of a duplicate check for a single incoming result.
 *
 * - `shouldOmit`     → skip create/update for the incoming row (Rule 1 & 2).
 * - `resultsToDelete` → lower-priority duplicates safe to remove after sync.
 * - `protectedFromDeletion` → duplicates that lost but cannot be deleted (Rule 4).
 */
export type DuplicateResultValidationResult = {
  shouldOmit: boolean;
  resultsToDelete: number[];
  protectedFromDeletion: number[];
};

/** Rule 3 helper: detects AICCRA Capacity Sharing for Development indicator. */
const isAiccraCapacitySharing = (participant: DuplicateResultParticipant) =>
  participant.platformCode === ReportingPlatformEnum.AICCRA &&
  participant.indicatorId === IndicatorsEnum.CAPACITY_SHARING_FOR_DEVELOPMENT;

/**
 * Rule 3 helper: detects any row originating from PRMS or TIP.
 * AICCRA Capacity Sharing prevails over all PRMS/TIP indicators, not only KP.
 */
const isPrmsOrTip = (participant: DuplicateResultParticipant) =>
  participant.platformCode === ReportingPlatformEnum.PRMS ||
  participant.platformCode === ReportingPlatformEnum.TIP;

/**
 * Resolves which of two results prevails when they share the same public link.
 *
 * Evaluation order matters — rules are checked from most specific to most general:
 *
 *  1. Rule 3 — AICCRA Capacity Sharing beats any PRMS/TIP result.
 *  2. Rule 1 — TIP beats PRMS and non-CS AICCRA (default cross-platform priority).
 *  3. Rule 2 — AICCRA beats PRMS when TIP is not part of the comparison.
 *
 * @param incoming - The result currently being synced (PRMS or TIP).
 * @param existing - A row already stored in `results` with the same public link.
 * @returns `'incoming'` if the sync should proceed; `'existing'` if it should be omitted.
 */
export function resolveDuplicateWinner(
  incoming: DuplicateResultParticipant,
  existing: DuplicateResultParticipant,
): 'incoming' | 'existing' {
  // Rule 3: incoming AICCRA Capacity Sharing overrides any existing PRMS/TIP row.
  if (isAiccraCapacitySharing(incoming) && isPrmsOrTip(existing)) {
    return 'incoming';
  }

  // Rule 3 (reverse): existing AICCRA Capacity Sharing blocks any incoming PRMS/TIP row.
  if (isAiccraCapacitySharing(existing) && isPrmsOrTip(incoming)) {
    return 'existing';
  }

  // Rule 1: TIP wins against PRMS and non-CS AICCRA (unless Rule 3 already applied).
  if (
    incoming.platformCode === ReportingPlatformEnum.TIP &&
    existing.platformCode !== ReportingPlatformEnum.TIP
  ) {
    return 'incoming';
  }

  if (
    existing.platformCode === ReportingPlatformEnum.TIP &&
    incoming.platformCode !== ReportingPlatformEnum.TIP
  ) {
    return 'existing';
  }

  // Rule 2: AICCRA wins over PRMS when TIP is not involved.
  if (
    incoming.platformCode === ReportingPlatformEnum.AICCRA &&
    existing.platformCode === ReportingPlatformEnum.PRMS
  ) {
    return 'incoming';
  }

  if (
    existing.platformCode === ReportingPlatformEnum.AICCRA &&
    incoming.platformCode === ReportingPlatformEnum.PRMS
  ) {
    return 'existing';
  }

  // No cross-platform conflict detected; allow the incoming sync to proceed.
  return 'incoming';
}

/**
 * Aggregates priority decisions across every duplicate found for one public link.
 *
 * For each stored duplicate:
 *  - If it wins → set `shouldOmit = true` (incoming must not be created/updated).
 *  - If incoming wins and the duplicate is not protected → add to `resultsToDelete`.
 *  - If incoming wins but the duplicate is in `protectedResultIds` (Rule 4) →
 *    add to `protectedFromDeletion` instead of deleting.
 *
 * @param incoming          - Platform and indicator of the row being synced.
 * @param duplicates        - Other-platform rows with the same public link.
 * @param protectedResultIds - `result_id` values referenced in `link_results.other_result_id`.
 */
export function evaluateDuplicateResults(
  incoming: DuplicateResultParticipant,
  duplicates: Array<DuplicateResultParticipant & { resultId: number }>,
  protectedResultIds: number[] = [],
): DuplicateResultValidationResult {
  const protectedSet = new Set(protectedResultIds);
  const resultsToDelete: number[] = [];
  let shouldOmit = false;

  for (const duplicate of duplicates) {
    const winner = resolveDuplicateWinner(incoming, duplicate);

    // Any single higher-priority duplicate is enough to block the incoming row.
    if (winner === 'existing') {
      shouldOmit = true;
      continue;
    }

    // Incoming wins — schedule deletion unless Rule 4 applies.
    if (protectedSet.has(duplicate.resultId)) {
      continue;
    }

    resultsToDelete.push(duplicate.resultId);
  }

  // Surface protected duplicates explicitly so callers can log or audit them.
  const protectedFromDeletion = duplicates
    .filter((duplicate) => {
      const winner = resolveDuplicateWinner(incoming, duplicate);
      return winner === 'incoming' && protectedSet.has(duplicate.resultId);
    })
    .map((duplicate) => duplicate.resultId);

  return {
    shouldOmit,
    resultsToDelete,
    protectedFromDeletion,
  };
}

/**
 * Normalizes a public link before comparison.
 * Empty or whitespace-only values are treated as "no link" and skip deduplication.
 */
export function normalizePublicLink(link?: string | null): string | null {
  const normalized = link?.trim();
  return normalized ? normalized : null;
}
