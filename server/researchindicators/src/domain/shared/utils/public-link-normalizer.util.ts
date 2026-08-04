// @sdd-spec results/cross-platform-duplicate-resolution

/**
 * Single source of truth for public-link normalization used by cross-platform
 * duplicate detection.
 *
 * The expression is built once and applied to BOTH sides of every comparison —
 * the stored `results.public_link` column and the incoming value bound as a
 * parameter. Symmetry is therefore structural rather than something a test has
 * to police, and there is no second implementation to drift from. An earlier
 * revision of this spec normalized only the incoming value in TypeScript and
 * compared it against raw storage, which is why trailing whitespace and scheme
 * differences went undetected.
 *
 * ## Why the explicit binary collation is not optional
 *
 * `results.public_link` is `utf8mb3_general_ci` (measured on the live schema),
 * and the datasource default is `utf8mb4_unicode_520_ci`. Both fold **case and
 * accents**: `'abc' = 'ABC'` and `'jose' = 'josé'` both evaluate to 1. A plain
 * `=` or `GROUP BY` on this column therefore ignores path case no matter what
 * the normalization expression does, which would make R-RES-001 AC.2
 * unsatisfiable — and the failure direction is **over-matching**, i.e. two
 * distinct publications collapsing into one group and one of them being
 * hard-deleted. Every comparison must run under `utf8mb4_bin`.
 *
 * ## What is normalized, and what deliberately is not
 *
 * Normalized: surrounding whitespace, the `http://` / `https://` scheme, a
 * leading `www.`, host letter case, `dx.doi.org` → `doi.org`, one trailing `/`,
 * and a trailing empty `?` or `#`.
 *
 * NOT normalized: **path letter case** (handles such as `/handle/10568/Abc` are
 * case-sensitive) and **query parameters** (a non-empty query can identify a
 * different resource). Both exclusions exist because over-matching destroys
 * data while under-matching only leaves a duplicate for a later run.
 *
 * Measured note: across the live corpus this normalization finds exactly the
 * same 116 cross-platform duplicate groups as a bare `TRIM`, and no two
 * binary-distinct links collide under it. It is a hedge against future variance,
 * not a detection mechanism — which is why no persisted column or index was
 * added for it.
 */

/** Collation that every normalized comparison and grouping must run under. */
export const BINARY_LINK_COLLATION = 'utf8mb4_bin';

/**
 * Builds the normalization expression for one operand.
 *
 * @param operand A **trusted SQL literal** — a qualified column reference such
 *        as `'r.public_link'`, or a bound parameter placeholder `'?'`. It is
 *        interpolated directly into the SQL string, so it MUST NEVER carry
 *        request input. Values always travel as bound parameters.
 * @returns A raw SQL expression producing the normalized link, cast to
 *          `utf8mb4` and collated binary so comparisons are case- and
 *          accent-sensitive.
 *
 * The steps run in a specific order: the host is lowercased **before** `www.`
 * and `dx.doi.org` are stripped, because MySQL's `REPLACE()` is case-sensitive
 * regardless of collation and would otherwise miss `WWW.` or `DX.DOI.ORG`.
 */
export const normalizedPublicLinkSql = (operand: string): string => {
  // Each step must reference its input ONCE wherever possible. A first cut built
  // this from nested IF/RIGHT/LEFT expressions, which re-embedded every
  // intermediate result several times and blew the operand up to 1,728
  // repetitions — a SQL string hundreds of kilobytes long needing 1,728 bound
  // parameters per query. `REGEXP_REPLACE` and `TRIM(TRAILING …)` each take their
  // argument once, which keeps the whole expression at 4 operand uses.
  //
  // No step may contain a literal `?`. mysql2 does not reliably skip `?` inside
  // quoted SQL when binding an array of parameters, so a literal `'?'` would be
  // consumed as a placeholder and silently shift every subsequent bind. The
  // trailing empty query is therefore matched via `CHAR(63)`, not `'?'`.

  // 1. Trim, then drop the scheme and a leading `www.` in two passes.
  //    Case-insensitive via the `i` match type, so `HTTPS://` and `WWW.` are
  //    handled before the host is lowercased.
  //
  //    Alternation is used instead of the optional quantifiers `https?://` and
  //    `(www\.)?` because every `?` those introduce is a literal `?` in the SQL
  //    text, which mysql2 consumes as a bind placeholder. Each pass still
  //    references its input once, so the operand count stays at 4.
  const withoutScheme = `REGEXP_REPLACE(TRIM(${operand}), '^(https://|http://)', '', 1, 0, 'i')`;
  const withoutSchemeOrWww = `REGEXP_REPLACE(${withoutScheme}, '^www\\\\.', '', 1, 0, 'i')`;

  // 2. Lowercase the host only. The path keeps its case — handles such as
  //    `/handle/10568/Abc` are case-sensitive, and folding them would over-match.
  const host = `LOWER(SUBSTRING_INDEX((${withoutSchemeOrWww}), '/', 1))`;
  const path = `IF(LOCATE('/', (${withoutSchemeOrWww})) > 0,
      SUBSTRING((${withoutSchemeOrWww}), LOCATE('/', (${withoutSchemeOrWww}))),
      '')`;
  const rejoined = `CONCAT(${host}, ${path})`;

  // 3. Unify the DOI resolver host. Safe as a plain prefix now that it is lowercase.
  const doiUnified = `REGEXP_REPLACE(${rejoined}, '^dx\\\\.doi\\\\.org', 'doi.org')`;

  // 4. Drop a trailing empty query or fragment, then trailing slashes.
  //    CHAR(63) is '?' and CHAR(35) is '#'.
  const withoutEmptyQuery = `TRIM(TRAILING CHAR(35) FROM TRIM(TRAILING CHAR(63) FROM ${doiUnified}))`;
  const withoutTrailingSlash = `TRIM(TRAILING '/' FROM ${withoutEmptyQuery})`;

  // 5. Force a binary collation so path case and accents are significant.
  return `CAST((${withoutTrailingSlash}) AS CHAR CHARACTER SET utf8mb4) COLLATE ${BINARY_LINK_COLLATION}`;
};

/**
 * How many times the expression repeats its operand.
 *
 * The normalization references its operand in many sub-expressions, so a caller
 * binding a value through `?` must repeat that value exactly this many times.
 * Deriving the count from the expression itself keeps it correct when the
 * expression changes — hand-counting placeholders is how a first cut of the
 * verification harness silently produced a malformed query.
 */
export const normalizedPublicLinkOperandUses = (): number =>
  (normalizedPublicLinkSql('__OPERAND__').match(/__OPERAND__/g) ?? []).length;

/**
 * Builds the parameter list for one bound operand.
 *
 * @example
 *   const sql = `... WHERE ${normalizedPublicLinkMatchSql('r.public_link')}`;
 *   await this.query(sql, [...normalizedPublicLinkParams(link)]);
 */
export const normalizedPublicLinkParams = (value: string): string[] =>
  new Array(normalizedPublicLinkOperandUses()).fill(value);

/**
 * Predicate matching a stored column against an incoming value, with the same
 * expression on both sides.
 *
 * @param columnRef Trusted SQL reference to the stored column.
 * @param placeholder Parameter placeholder carrying the incoming value. Bind it
 *        with {@link normalizedPublicLinkParams}.
 */
export const normalizedPublicLinkMatchSql = (
  columnRef: string,
  placeholder = '?',
): string =>
  `${normalizedPublicLinkSql(columnRef)} = ${normalizedPublicLinkSql(placeholder)}`;

/**
 * Predicate for "this row has a usable public link at all".
 *
 * A blank or whitespace-only link means "no link" and must never take part in
 * deduplication (R-RES-001).
 */
export const hasUsablePublicLinkSql = (columnRef: string): string =>
  `${columnRef} IS NOT NULL AND TRIM(${columnRef}) <> ''`;

/**
 * Row-scope predicate shared by the sync lookup and the sweep scan.
 *
 * `is_snapshot` and `is_active` are nullable with no database default, so both
 * are read through `COALESCE`: a single NULL would otherwise silently shrink the
 * candidate set, which reads as "nothing to do" rather than as a fault.
 *
 * @param alias Trusted SQL alias of the `results` table.
 */
export const dedupScopeSql = (alias: string): string =>
  `COALESCE(${alias}.is_active, TRUE) = TRUE
   AND COALESCE(${alias}.is_snapshot, FALSE) = FALSE
   AND ${alias}.platform_code IN ('PRMS', 'TIP', 'AICCRA')
   AND ${hasUsablePublicLinkSql(`${alias}.public_link`)}`;
