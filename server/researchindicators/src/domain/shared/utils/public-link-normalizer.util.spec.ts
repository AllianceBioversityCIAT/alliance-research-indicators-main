/**
 * These tests cover the STRUCTURE of the normalization SQL. They cannot cover its
 * BEHAVIOR: whether `/handle/10568/Abc` and `/handle/10568/abc` actually fail to
 * match depends on MySQL's collation handling, and no unit test without a
 * database can observe it.
 *
 * That split is deliberate and is recorded so a green run here is not mistaken
 * for the guarantee:
 *
 *  - Structure (this file): the same expression on both sides, the binary
 *    collation present, path case never folded, operand-binding arity correct.
 *  - Behavior (T-11 integration): the adversarial match/no-match table.
 *
 * The behavioral table was measured against the live dev database on 2026-08-04:
 * 16 of 16 cases correct, including `path case differs`, `accent differs`, and
 * `non-empty query differs`. The standing assertion belongs in T-11.
 */
import {
  BINARY_LINK_COLLATION,
  dedupScopeSql,
  hasUsablePublicLinkSql,
  normalizedPublicLinkMatchSql,
  normalizedPublicLinkOperandUses,
  normalizedPublicLinkParams,
  normalizedPublicLinkSql,
} from './public-link-normalizer.util';

describe('normalizedPublicLinkSql', () => {
  it('is symmetric by construction — the identical expression for either operand', () => {
    // The single property the whole design rests on: one expression, applied to
    // both sides. An earlier revision normalized only the incoming value and
    // compared it against raw storage.
    const column = normalizedPublicLinkSql('r.public_link');
    const parameter = normalizedPublicLinkSql('?');
    expect(column.split('r.public_link').length).toBeGreaterThan(1);
    expect(column.replace(/r\.public_link/g, '§')).toBe(
      parameter.replace(/\?/g, '§'),
    );
  });

  it('forces the binary collation on the result', () => {
    // Without this, `public_link` (utf8mb3_general_ci) folds case AND accents, so
    // path case is ignored and distinct publications collapse — over-matching,
    // which here means a hard delete. See the negative control in T-11.
    const sql = normalizedPublicLinkSql('r.public_link');
    expect(sql).toContain(`COLLATE ${BINARY_LINK_COLLATION}`);
    expect(sql).toContain('CHARACTER SET utf8mb4');
    expect(BINARY_LINK_COLLATION).toBe('utf8mb4_bin');
  });

  it('applies the collation once, at the outermost level', () => {
    const sql = normalizedPublicLinkSql('r.public_link');
    expect(sql.match(/COLLATE/g)).toHaveLength(1);
    expect(sql.trimStart().startsWith('CAST(')).toBe(true);
  });

  it('lowercases only the host — the path is never folded', () => {
    // LOWER() must wrap the host segment, never the whole operand. A single
    // LOWER() around everything would silently satisfy every other assertion
    // here while breaking R-RES-001 AC.2.
    const sql = normalizedPublicLinkSql('LINK');
    expect(sql).toContain('LOWER(');
    expect(sql).not.toMatch(/LOWER\(\s*TRIM\(\s*LINK\s*\)\s*\)/);
    // LOWER wraps only the host segment produced by SUBSTRING_INDEX(..., '/', 1).
    expect(sql).toContain('LOWER(SUBSTRING_INDEX(');
    // The path segment is taken with SUBSTRING and concatenated untouched.
    expect(sql).toContain('SUBSTRING(');
    expect(sql).toContain('CONCAT(');
  });

  it('covers each normalization step required by R-RES-001 AC.1', () => {
    const sql = normalizedPublicLinkSql('LINK');
    expect(sql).toContain('TRIM(');
    expect(sql).toContain('https://');
    expect(sql).toContain('www');
    expect(sql).toContain('dx');
    expect(sql).toContain("'doi.org'");
    // CHAR(63)='?' and CHAR(35)='#': a literal '?' in the SQL would be consumed
    // as a bind placeholder by mysql2 and shift every subsequent parameter.
    expect(sql).toContain('CHAR(63)');
    expect(sql).toContain('CHAR(35)');
    expect(sql).toContain("TRIM(TRAILING '/'");
  });

  it('does not strip query parameters', () => {
    // Only a trailing empty '?' or '#' is removed. A non-empty query can identify
    // a different resource, so stripping it would over-match.
    const sql = normalizedPublicLinkSql('LINK');
    expect(sql).not.toContain('SUBSTRING_INDEX(LINK, CHAR(63)');
  });
});

describe('operand binding arity', () => {
  it('keeps operand repetition small — nested interpolation once reached 1,728', () => {
    // Regression guard. Built from nested IF/RIGHT/LEFT the expression
    // re-embedded every intermediate result and multiplied the operand to 1,728
    // repetitions: a SQL string hundreds of kilobytes long needing 1,728 bound
    // parameters. REGEXP_REPLACE and TRIM(TRAILING …) take their argument once.
    expect(normalizedPublicLinkOperandUses()).toBeLessThanOrEqual(8);
  });

  it('contains no literal question mark, which mysql2 would bind as a parameter', () => {
    // mysql2 does not reliably skip `?` inside quoted SQL, so a literal '?' is
    // consumed as a placeholder and shifts every subsequent bind.
    expect(normalizedPublicLinkSql('r.public_link')).not.toContain('?');
  });

  it('reports how many times the expression repeats its operand', () => {
    const uses = normalizedPublicLinkOperandUses();
    expect(uses).toBeGreaterThan(1);
    const rendered = normalizedPublicLinkSql('?');
    expect(rendered.match(/\?/g) ?? []).toHaveLength(uses);
  });

  it('builds a parameter list of exactly that length', () => {
    const params = normalizedPublicLinkParams('https://doi.org/10.1/abc');
    expect(params).toHaveLength(normalizedPublicLinkOperandUses());
    expect(new Set(params)).toEqual(new Set(['https://doi.org/10.1/abc']));
  });

  it('keeps the match predicate consistent with the binding helper', () => {
    // A hand-counted placeholder list is how a first cut of the verification
    // harness produced a malformed query, so the count is derived, not written.
    const predicate = normalizedPublicLinkMatchSql('r.public_link');
    const placeholders = predicate.match(/\?/g) ?? [];
    expect(placeholders).toHaveLength(normalizedPublicLinkOperandUses());
  });
});

describe('dedupScopeSql', () => {
  it('reads both nullable flags through COALESCE', () => {
    // is_snapshot and is_active are nullable with no DB default. A bare
    // `is_snapshot = FALSE` does not match NULL, which would silently shrink the
    // candidate set and read as "nothing to do".
    const sql = dedupScopeSql('r');
    expect(sql).toContain('COALESCE(r.is_active, TRUE) = TRUE');
    expect(sql).toContain('COALESCE(r.is_snapshot, FALSE) = FALSE');
  });

  it('honours the alias it is given', () => {
    expect(dedupScopeSql('x')).toContain('COALESCE(x.is_active, TRUE) = TRUE');
    expect(hasUsablePublicLinkSql('x.public_link')).toContain(
      'x.public_link IS NOT NULL',
    );
  });

  it('no longer carries the platform or identity-presence predicate (rev 3 split)', () => {
    // That half moved into each UNION branch in publication-identity.util.ts,
    // because the identity SOURCE is per-platform — a single shared predicate
    // here could not describe both `public_link` and `result_evidences`.
    const sql = dedupScopeSql('r');
    expect(sql).not.toContain('platform_code');
    expect(sql).not.toContain('public_link');
  });

  it('never references external_link', () => {
    // external_link points at the source platform portal and would never produce
    // a reliable cross-platform match.
    expect(dedupScopeSql('r')).not.toContain('external_link');
    expect(normalizedPublicLinkSql('r.public_link')).not.toContain(
      'external_link',
    );
  });
});

describe('hasUsablePublicLinkSql', () => {
  it('excludes rows without a usable public link', () => {
    const sql = hasUsablePublicLinkSql('r.public_link');
    expect(sql).toContain('r.public_link IS NOT NULL');
    expect(sql).toContain("TRIM(r.public_link) <> ''");
  });
});
