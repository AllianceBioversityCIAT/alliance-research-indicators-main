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
 * ## The SQL form (T-15)
 *
 * T-15 adds the SQL form of this same predicate — the stored-side query the
 * sweep and the sync lookup both read through
 * `DuplicateCandidateRepository`'s identity `UNION ALL` (design §3.1.2) —
 * BESIDE the in-memory form above, in this same file, so both forms are
 * edited together and cannot drift apart. See
 * {@link isHandleFormatIdentitySql}, {@link publicLinkIdentityScopeSql} and
 * {@link prmsHandleEvidenceScopeSql} below.
 *
 * The two forms are no longer asserting the same equivalence rev 3 planned
 * (§3.1.1): the stored side reads a `result_evidences` ROW, the in-memory
 * form above reads a payload SCALAR. What both forms provably share instead
 * is the canonical handle SHAPE — {@link HANDLE_FORMAT_PATTERN} in memory,
 * {@link isHandleFormatIdentitySql} in SQL — derived from the one pattern
 * source below so they cannot describe two different shapes
 * (`publication-identity.util.spec.ts`'s "stored-vs-incoming handle-format
 * agreement" suite proves this). Whether the STORED evidence handle and the
 * INCOMING payload handle agree for a given real result is a fact about
 * DATA, not about this code, and no unit test can establish it — that is
 * T-14's job (measured baseline 2026-08-05: 277/277 live KP items).
 */

import { IndicatorsEnum } from '../../entities/indicators/enum/indicators.enum';
import { ReportingPlatformEnum } from '../../entities/results/enum/reporting-platform.enum';
import { EvidenceRoleEnum } from '../../entities/evidence-roles/enums/evidence-role.enum';
import { isEmpty } from './object.utils';
import {
  hasUsablePublicLinkSql,
  normalizedPublicLinkSql,
} from './public-link-normalizer.util';

/**
 * Canonical handle shape, applied to the NORMALIZED value:
 * `hdl.handle.net/<digits>/<digits>` exactly — no scheme, no `www.`, no
 * trailing slash, no extra path segments (R-RES-010, PRMS identity predicate
 * condition 4).
 *
 * Declared once as a bare pattern SOURCE, not as a JS `RegExp` literal,
 * because {@link isHandleFormatIdentitySql} builds the SQL `REGEXP` form from
 * this SAME string — one canonical shape feeding both the in-memory and the
 * SQL predicate, so a future edit to "what counts as a handle" cannot change
 * one side and silently leave the other testing something else. `[0-9]`
 * rather than `\d`: MySQL 8's ICU-backed `REGEXP` supports Perl shorthand, but
 * an explicit character class needs no version assumption to read correctly
 * on either side.
 */
const HANDLE_FORMAT_PATTERN_SOURCE = '^hdl\\.handle\\.net/[0-9]+/[0-9]+$';
const HANDLE_FORMAT_PATTERN = new RegExp(HANDLE_FORMAT_PATTERN_SOURCE);

/**
 * In-memory mirror of `normalizedPublicLinkSql`'s (`public-link-normalizer.util.ts`)
 * trim / scheme / `www.` / host-case / `dx.doi.org` / trailing-slash rules.
 *
 * This is NOT the cross-platform comparison itself — that still runs entirely
 * in SQL, in `DuplicateCandidateRepository`'s identity `UNION ALL`, with the
 * identical expression applied to both sides, which is what makes R-RES-001
 * AC.6 ("the normalization applied to a PRMS handle is byte-identical to the
 * one applied to a TIP public_link") true by construction: the raw handle
 * string this file selects is handed to the same SQL path a raw `public_link`
 * would be. **Rev 4 correction:** the SQL side is no longer "untouched by
 * this task" and no longer "only ever reads `public_link`" — T-15 adds that
 * SQL form BELOW, in this same file ({@link isHandleFormatIdentitySql},
 * {@link publicLinkIdentityScopeSql}, {@link prmsHandleEvidenceScopeSql}),
 * and its PRMS branch reads `result_evidences.evidence_url` and applies the
 * identical handle-format filter this in-memory mirror exists to apply. This
 * mirror still decides, in memory, whether one INCOMING evidence entry's
 * `evidence_url` is handle-shaped before it is allowed to become an identity
 * candidate at all — the stored side makes the equivalent decision in SQL,
 * not none at all.
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

// ---------------------------------------------------------------------------
// SQL form (T-15) — the stored-side query `DuplicateCandidateRepository`
// composes into its identity `UNION ALL` (design §3.1.2, §3.1.3).
// ---------------------------------------------------------------------------

/** Which field supplied a candidate's identity (R-RES-009 AC.4). */
export enum PublicationIdentitySource {
  PUBLIC_LINK = 'PUBLIC_LINK',
  HANDLE_EVIDENCE = 'HANDLE_EVIDENCE',
}

/**
 * SQL `REGEXP` form of {@link isHandleFormatIdentity}, tested against the
 * ALREADY-NORMALIZED, binary-collated expression (never the raw column) —
 * exactly like the in-memory form, which only ever tests
 * {@link normalizeIdentityCandidate}'s output.
 *
 * The pattern text is escaped, not hand-copied: `HANDLE_FORMAT_PATTERN_SOURCE`
 * contains one literal backslash before each `.` (`\.`, matching a literal
 * dot). A MySQL single-quoted string literal itself interprets a backslash as
 * an escape character, so surviving that layer needs the backslash DOUBLED in
 * the SQL text — `.replace(/\\/g, '\\\\')` does exactly that and nothing
 * else, so the regex the engine ultimately evaluates is byte-identical to the
 * one {@link HANDLE_FORMAT_PATTERN} runs in memory (see this file's spec,
 * "stored-vs-incoming handle-format agreement", which extracts this literal
 * back out of the generated SQL and proves the round trip rather than
 * asserting it by construction).
 *
 * No `?` appears in the pattern, so there is no mysql2 bind-placeholder risk
 * (`public-link-normalizer.util.ts`'s operand-binding note).
 */
const HANDLE_FORMAT_SQL_PATTERN = HANDLE_FORMAT_PATTERN_SOURCE.replace(
  /\\/g,
  '\\\\',
);

export const isHandleFormatIdentitySql = (operand: string): string =>
  `${normalizedPublicLinkSql(operand)} REGEXP '${HANDLE_FORMAT_SQL_PATTERN}'`;

/**
 * TIP/AICCRA branch scope (design §3.1.1 / §3.1.2): identity is
 * `results.public_link`, unchanged, with NO format filter — R-RES-010 AC.6
 * measured AICCRA at 315/584 handle-format, so a filter here would drop 269
 * real rows out of scope.
 *
 * Deliberately does NOT include {@link dedupScopeSql} — that predicate is
 * platform- and identity-source-INVARIANT (`is_active`/`is_snapshot`) and is
 * applied once by the caller alongside this branch-local predicate, never
 * duplicated into it.
 */
export const publicLinkIdentityScopeSql = (resultAlias: string): string =>
  `${resultAlias}.platform_code IN ('TIP', 'AICCRA')
   AND ${hasUsablePublicLinkSql(`${resultAlias}.public_link`)}`;

/**
 * PRMS branch scope (design §3.1.1 / §3.1.2) — the SQL mirror of
 * {@link resolveIncomingPublicationIdentity}'s STORED-side conditions, all
 * four conjunctive (R-RES-010):
 *
 *  1. KP-only (`indicator_id = 3`) — a handle on any other indicator is a
 *     citation, not this result's own publication (DC-10);
 *  2. `evidence_role_id = 1` (`EvidenceRoleEnum.PRINCIPAL_EVIDENCE`);
 *  3. `COALESCE(is_private, FALSE) = FALSE`;
 *  4. `COALESCE(is_active, TRUE) = TRUE` — measured to change nothing today
 *     (2,792 rows either way), required anyway so a retracted evidence
 *     cannot confer identity;
 *  plus the handle-format filter, required on this branch only.
 *
 * The caller `JOIN`s `result_evidences` and MUST also `GROUP BY (result_id,
 * normalized identity)` — this predicate alone does not deduplicate
 * `result_evidences`' missing unique constraint on `(result_id,
 * evidence_url)` (JD3-S-04); that is the repository's job, not this
 * function's.
 */
export const prmsHandleEvidenceScopeSql = (params: {
  resultAlias: string;
  evidenceAlias: string;
}): string => {
  const { resultAlias, evidenceAlias } = params;
  return `${resultAlias}.platform_code = 'PRMS'
   AND ${resultAlias}.indicator_id = ${IndicatorsEnum.KNOWLEDGE_PRODUCT}
   AND ${evidenceAlias}.evidence_role_id = ${EvidenceRoleEnum.PRINCIPAL_EVIDENCE}
   AND COALESCE(${evidenceAlias}.is_private, FALSE) = FALSE
   AND COALESCE(${evidenceAlias}.is_active, TRUE) = TRUE
   AND ${isHandleFormatIdentitySql(`${evidenceAlias}.evidence_url`)}`;
};
