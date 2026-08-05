// @sdd-spec results/cross-platform-duplicate-resolution

/**
 * PRMS publication identity (R-RES-010) — the **in-memory** form only.
 *
 * The sync path's duplicate check runs *before* the incoming row is saved
 * (design §5.2 step 0), so the stored-side SQL branch this file's future
 * companion form will use (`DuplicateCandidateRepository`, T-15) is not
 * available yet for the incoming row. Its identity has to be resolved from
 * the payload, in memory, right here.
 *
 * ## Why this file exists at all — corrected twice, by two different wrong
 * assumptions
 *
 * Rev 3 was first authored believing `ExternalMappersDto.evidence.evidence[]`
 * "already carries" the PRMS publication handle — a belief that came from
 * reading TIP's mapper (which does populate that field via
 * `processKnowledgeProduct`) onto PRMS's (JD3-01). Corrected within rev 3 to
 * "populate it by reviving `processKnowledgeProduct`" — but THAT premise is
 * what rev 4 falsified: the method reads `item.result_knowledge_product_array`,
 * which is on NONE of 13,507 real staged PRMS payloads. Reviving it is now
 * forbidden outright — see `prms.opensearch.service.ts` — for a second,
 * independent reason: it also writes `body.knowledgeProduct`, which has a
 * live production reader.
 *
 * **The real field is `item.knowledge_product_summary.handle`**, a
 * purpose-built scalar carrying the KP result's own publication handle,
 * measured present and handle-format on 277/277 live Knowledge Product
 * items. `processData` carries it into
 * `ExternalMappersDto.evidence.evidence[]` — the SHAPE this file consumes is
 * unchanged (still an array of evidence partials, still filtered to
 * handle-format), only its SOURCE changed, from a raw PRMS evidence loop to
 * one mapper-inserted entry holding this scalar. See
 * `docs/specs/results/cross-platform-duplicate-resolution/design.md` §0.5 /
 * §5.2 and `execution.md` -> "Pivot Record: T-13 — RESOLVED BY OBSERVATION"
 * for the measured history.
 *
 * ## Identity, per platform (design §5.2)
 *
 * | Platform | Identity source |
 * | --- | --- |
 * | TIP, AICCRA | `public_link`, unchanged — never format-filtered (a filter would drop 269 real AICCRA rows, measured) |
 * | PRMS, `indicator_id = 3` (KNOWLEDGE_PRODUCT) | `evidence[]` entries whose `evidence_url`, normalized, is handle-format |
 * | PRMS, any other indicator | none — not a dedup participant (a handle on a non-KP row is a citation, not this result's own publication; treating it as identity is DC-10) |
 *
 * PRMS's own `public_link` (its `pdf_link`) NEVER contributes an identity —
 * matching it against anything is forbidden (R-RES-010 AC.2), which is why the
 * function below never reads `publicLink` when `platformCode` is PRMS.
 *
 * ## The role/privacy/active asymmetry is RETIRED, not accepted (rev 4)
 *
 * Rev 3 described the payload's evidence partials as missing
 * `evidence_role_id`, `is_private` and `is_active` relative to the stored
 * side's four-condition predicate, and treated the gap as an accepted risk.
 * That framing no longer applies: the one entry this file's PRMS branch now
 * sees is not a raw evidence row at all — it is `processData` copying
 * `item.knowledge_product_summary.handle`, a field with no role, nothing to
 * mark private, and nothing to retract. There is no evidence-list predicate
 * to be weaker than. The handle-format filter is the only predicate on
 * either side, and both sides genuinely share it (design §5.2). Do NOT
 * "improve" this by inventing `evidence_role_id`/`is_private`/`is_active` on
 * the types below, and do not describe this asymmetry as a live, accepted
 * risk in a PR — it is retired.
 *
 * ## Extension point for T-15
 *
 * T-15 adds the SQL form of this same predicate (the stored-side query the
 * sweep will use) BESIDE the in-memory form above, in this same file, so both
 * forms are edited together and cannot drift apart — the same reason
 * `public-link-normalizer.util.ts` is the single home for the public-link
 * expression both the sync lookup and the sweep scan share. Nothing below is
 * structured around `public_link`, so that addition needs no rework here.
 */

import { IndicatorsEnum } from '../../entities/indicators/enum/indicators.enum';
import { ReportingPlatformEnum } from '../../entities/results/enum/reporting-platform.enum';
import { isEmpty } from './object.utils';

/**
 * Canonical handle shape, applied to the NORMALIZED value:
 * `hdl.handle.net/<digits>/<digits>` exactly — no scheme, no `www.`, no
 * trailing slash, no extra path segments (R-RES-010, PRMS identity predicate
 * condition 4).
 */
const HANDLE_FORMAT_PATTERN = /^hdl\.handle\.net\/\d+\/\d+$/;

/**
 * In-memory mirror of `normalizedPublicLinkSql`'s (`public-link-normalizer.util.ts`)
 * trim / scheme / `www.` / host-case / `dx.doi.org` / trailing-slash rules.
 *
 * This is NOT the cross-platform comparison itself — that still runs entirely
 * in SQL (`DuplicateCandidateRepository`, untouched by this task, per its hard
 * scope bound: no SQL form here) with the identical expression applied to
 * both sides, which is what makes R-RES-001 AC.6 ("the normalization applied
 * to a PRMS handle is byte-identical to the one applied to a TIP public_link")
 * true by construction: the raw handle string this file selects is handed to
 * the same SQL path a raw `public_link` would be. This mirror exists ONLY to
 * decide, in memory, whether one evidence entry's `evidence_url` is
 * handle-shaped before it is allowed to become an identity candidate at all —
 * a decision the SQL side never has to make because it only ever reads
 * `public_link`.
 *
 * Path case and non-empty query parameters are deliberately never folded —
 * folding either is over-matching, and over-matching here means a hard delete
 * of a distinct publication (R-RES-001 AC.2).
 */
export function normalizeIdentityCandidate(
  value?: string | null,
): string | null {
  if (isEmpty(value)) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;

  const withoutScheme = trimmed.replace(/^https?:\/\//i, '');
  const withoutWww = withoutScheme.replace(/^www\./i, '');

  const slashIndex = withoutWww.indexOf('/');
  const rawHost =
    slashIndex >= 0 ? withoutWww.slice(0, slashIndex) : withoutWww;
  const path = slashIndex >= 0 ? withoutWww.slice(slashIndex) : '';
  const host = rawHost.toLowerCase();

  const rejoined = `${host}${path}`;
  const doiUnified = rejoined.replace(/^dx\.doi\.org/, 'doi.org');
  const withoutEmptyQuery = doiUnified.replace(/[?#]$/, '');
  const withoutTrailingSlash = withoutEmptyQuery.replace(/\/+$/, '');

  return withoutTrailingSlash || null;
}

/**
 * Whether a raw value, once normalized, is the canonical handle shape.
 *
 * The handle-format filter is, per design §5.2, "the only load-bearing
 * predicate, and the only one both sides genuinely share" — the role and
 * privacy predicates are no-ops against today's data, but the format filter
 * is what discriminates a KP result's own handle from the non-handle
 * attachment ("x") the same result carries alongside it.
 */
export function isHandleFormatIdentity(value?: string | null): boolean {
  const normalized = normalizeIdentityCandidate(value);
  return normalized !== null && HANDLE_FORMAT_PATTERN.test(normalized);
}

/**
 * The only shape the sync payload's evidence partials carry.
 *
 * Deliberately narrower than the `ResultEvidence` entity: no
 * `evidence_role_id`, no `is_private`, no `is_active`. That is no longer an
 * accepted asymmetry to be "fixed" by inventing those fields (rev 4) — the
 * one entry the PRMS branch is fed is not a raw evidence row, it is
 * `processData` copying `item.knowledge_product_summary.handle` into this
 * shape, and that field has no role, privacy or retraction state to carry.
 */
export interface IncomingEvidencePartial {
  evidence_url?: string | null;
  evidence_description?: string | null;
}

/** Result of resolving one incoming row's identity from the payload, in memory. */
export interface IncomingIdentityResolution {
  /**
   * The RAW identity value to hand to the existing SQL match unchanged (its
   * normalization runs there — see the module doc), or `null` when this row
   * has none and is therefore not a dedup participant on this sync run.
   */
  identity: string | null;
  /**
   * `true` when the payload carries more than one qualifying identity
   * (R-RES-010 AC.9). **Rev 4: this is a defensive net, not live logic.**
   * `knowledge_product_summary.handle` is a scalar, so `processData` can
   * only ever feed this function zero or one handle-shaped entry — multi
   * count is unreachable by construction on the incoming side today. The
   * rev-3 justification ("`processKnowledgeProduct` loops a
   * `PrmsKnowledgeProductDto[]`") does not hold: that array is not on the
   * wire. Kept because the branch costs nothing and a future payload change
   * could reintroduce plurality; no PR may claim it guards a live scenario.
   * The caller MUST create/update the row normally, count no omission, and
   * delete nothing. Never resolve on the first handle found.
   */
  refused: boolean;
}

/**
 * Resolves the incoming row's publication identity from the payload
 * (design §5.2 step 0).
 */
export function resolveIncomingPublicationIdentity(params: {
  platformCode: ReportingPlatformEnum;
  indicatorId?: IndicatorsEnum | null;
  publicLink?: string | null;
  evidence?: IncomingEvidencePartial[] | null;
}): IncomingIdentityResolution {
  if (params.platformCode === ReportingPlatformEnum.PRMS) {
    // R-RES-010 AC.2: PRMS's own `public_link` (its `pdf_link`) NEVER
    // contributes an identity, on either side of the comparison — `publicLink`
    // is never read below this branch.
    if (params.indicatorId !== IndicatorsEnum.KNOWLEDGE_PRODUCT) {
      // Identity is KP-only (R-RES-010). A handle on any other indicator is a
      // citation, not this result's own publication (DC-10).
      return { identity: null, refused: false };
    }

    const handleEvidence = (params.evidence ?? []).filter((evidence) =>
      isHandleFormatIdentity(evidence?.evidence_url),
    );

    if (handleEvidence.length > 1) {
      // Never resolve on the first handle found (AC.9) — a defensive net,
      // not live logic today (see IncomingIdentityResolution.refused doc).
      return { identity: null, refused: true };
    }
    if (handleEvidence.length === 0) {
      return { identity: null, refused: false };
    }
    return { identity: handleEvidence[0].evidence_url ?? null, refused: false };
  }

  // TIP, AICCRA (and any future in-scope platform): identity is `public_link`,
  // unchanged — never format-filtered (design §5.2 / R-RES-010: a format
  // filter here would drop the 269 non-handle-format AICCRA rows measured to
  // be in scope).
  const rawLink = params.publicLink?.trim();
  return { identity: rawLink || null, refused: false };
}
