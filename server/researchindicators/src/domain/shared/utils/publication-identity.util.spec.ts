// @sdd-spec results/cross-platform-duplicate-resolution
/**
 * R-RES-010 / T-13 — the in-memory publication identity predicate.
 *
 * These tests cover only the positive/negative cases available to the
 * IN-MEMORY form: KP-only scoping, the handle-format filter, and the
 * multi-handle refusal (AC.9). The mapper that actually populates
 * `dto.evidence.evidence[]` is covered separately in
 * `prms.opensearch.service.spec.ts` (AC.10) — a hand-built evidence list here
 * proves only the resolver, never the mapper (tasks.md T-13 "what
 * disqualifies the evidence").
 */
import { IndicatorsEnum } from '../../entities/indicators/enum/indicators.enum';
import { ReportingPlatformEnum } from '../../entities/results/enum/reporting-platform.enum';
import {
  PublicationIdentitySource,
  isHandleFormatIdentity,
  isHandleFormatIdentitySql,
  normalizeIdentityCandidate,
  prmsHandleEvidenceScopeSql,
  publicLinkIdentityScopeSql,
  resolveIncomingPublicationIdentity,
} from './publication-identity.util';

describe('normalizeIdentityCandidate', () => {
  it('trims, drops the scheme and a leading www., and lowercases only the host', () => {
    expect(
      normalizeIdentityCandidate('  HTTPS://WWW.Handle.Net/10568/141764  '),
    ).toBe('handle.net/10568/141764');
  });

  it('never folds path case', () => {
    expect(normalizeIdentityCandidate('https://hdl.handle.net/10568/Abc')).toBe(
      'hdl.handle.net/10568/Abc',
    );
  });

  it('unifies dx.doi.org to doi.org', () => {
    expect(normalizeIdentityCandidate('https://dx.doi.org/10.1000/xyz')).toBe(
      'doi.org/10.1000/xyz',
    );
  });

  it('strips a trailing slash and a trailing empty query/fragment', () => {
    expect(
      normalizeIdentityCandidate('https://hdl.handle.net/10568/141764/'),
    ).toBe('hdl.handle.net/10568/141764');
    expect(
      normalizeIdentityCandidate('https://hdl.handle.net/10568/141764?'),
    ).toBe('hdl.handle.net/10568/141764');
  });

  it('returns null for empty/whitespace-only input', () => {
    expect(normalizeIdentityCandidate(undefined)).toBeNull();
    expect(normalizeIdentityCandidate(null)).toBeNull();
    expect(normalizeIdentityCandidate('   ')).toBeNull();
  });
});

describe('isHandleFormatIdentity', () => {
  it('accepts the canonical handle shape regardless of scheme/www/trailing slash', () => {
    expect(isHandleFormatIdentity('https://hdl.handle.net/10568/141764')).toBe(
      true,
    );
    expect(
      isHandleFormatIdentity('http://www.hdl.handle.net/10568/141764/'),
    ).toBe(true);
    expect(isHandleFormatIdentity('hdl.handle.net/10568/141764')).toBe(true);
  });

  it('rejects a non-handle URL (the CGSpace pdf_link PRMS also carries)', () => {
    expect(
      isHandleFormatIdentity('https://cgspace.cgiar.org/bitstream/x.pdf'),
    ).toBe(false);
  });

  it('rejects a handle-looking host with a non-digit path segment', () => {
    expect(isHandleFormatIdentity('https://hdl.handle.net/10568/abc')).toBe(
      false,
    );
    expect(isHandleFormatIdentity('https://hdl.handle.net/10568')).toBe(false);
  });

  it('rejects empty input', () => {
    expect(isHandleFormatIdentity(undefined)).toBe(false);
    expect(isHandleFormatIdentity('')).toBe(false);
  });
});

describe('resolveIncomingPublicationIdentity', () => {
  it('TIP: identity is public_link, unchanged (design §5.2)', () => {
    const resolution = resolveIncomingPublicationIdentity({
      platformCode: ReportingPlatformEnum.TIP,
      indicatorId: IndicatorsEnum.KNOWLEDGE_PRODUCT,
      publicLink: '  https://hdl.handle.net/10568/141764  ',
      evidence: [{ evidence_url: 'ignored-for-tip' }],
    });
    expect(resolution).toEqual({
      identity: 'https://hdl.handle.net/10568/141764',
      refused: false,
    });
  });

  it('AICCRA: identity is public_link even when it is not handle-format (AC.6 guard: no format filter on public_link)', () => {
    const resolution = resolveIncomingPublicationIdentity({
      platformCode: ReportingPlatformEnum.AICCRA,
      indicatorId: IndicatorsEnum.CAPACITY_SHARING_FOR_DEVELOPMENT,
      publicLink: 'https://aiccra.example/report/9001',
    });
    expect(resolution).toEqual({
      identity: 'https://aiccra.example/report/9001',
      refused: false,
    });
  });

  it('TIP/AICCRA with no public_link: no identity, no dedup', () => {
    const resolution = resolveIncomingPublicationIdentity({
      platformCode: ReportingPlatformEnum.TIP,
      indicatorId: IndicatorsEnum.KNOWLEDGE_PRODUCT,
      publicLink: '   ',
    });
    expect(resolution).toEqual({ identity: null, refused: false });
  });

  it('PRMS KP with exactly one handle-format evidence: identity is the raw handle (AC.1)', () => {
    const resolution = resolveIncomingPublicationIdentity({
      platformCode: ReportingPlatformEnum.PRMS,
      indicatorId: IndicatorsEnum.KNOWLEDGE_PRODUCT,
      publicLink: 'https://cgspace.cgiar.org/bitstream/x.pdf',
      evidence: [{ evidence_url: 'https://hdl.handle.net/10568/141764' }],
    });
    expect(resolution).toEqual({
      identity: 'https://hdl.handle.net/10568/141764',
      refused: false,
    });
  });

  it("PRMS's own public_link (pdf_link) NEVER contributes an identity (AC.2)", () => {
    // public_link happens to be handle-shaped here on purpose — the point is
    // that it must never be read for PRMS regardless of its shape.
    const resolution = resolveIncomingPublicationIdentity({
      platformCode: ReportingPlatformEnum.PRMS,
      indicatorId: IndicatorsEnum.KNOWLEDGE_PRODUCT,
      publicLink: 'https://hdl.handle.net/99999/999999',
      evidence: [],
    });
    expect(resolution).toEqual({ identity: null, refused: false });
  });

  it('PRMS KP with a handle-format partial and no role/privacy/active fields: still resolves — rev 4 retires that asymmetry, it does not accept it (design §5.2)', () => {
    // The payload partial has no such fields at all (`knowledge_product_summary`
    // is not an evidence list — nothing to exclude on), and this test documents
    // that the resolver does not invent them.
    const resolution = resolveIncomingPublicationIdentity({
      platformCode: ReportingPlatformEnum.PRMS,
      indicatorId: IndicatorsEnum.KNOWLEDGE_PRODUCT,
      evidence: [
        { evidence_url: 'https://hdl.handle.net/10568/141764' } as {
          evidence_url: string;
        },
      ],
    });
    expect(resolution.identity).toBe('https://hdl.handle.net/10568/141764');
  });

  it('PRMS KP with one handle-format and one non-handle entry: exactly one identity, the handle — covers the shared filter logic; AC.4 itself is stored-side only (rev 4), production never feeds this branch more than one entry', () => {
    const resolution = resolveIncomingPublicationIdentity({
      platformCode: ReportingPlatformEnum.PRMS,
      indicatorId: IndicatorsEnum.KNOWLEDGE_PRODUCT,
      evidence: [
        { evidence_url: 'https://hdl.handle.net/10568/141764' },
        { evidence_url: 'https://cgspace.cgiar.org/bitstream/other.pdf' },
      ],
    });
    expect(resolution).toEqual({
      identity: 'https://hdl.handle.net/10568/141764',
      refused: false,
    });
  });

  it('PRMS KP with zero qualifying handle evidence: no identity, no dedup', () => {
    const resolution = resolveIncomingPublicationIdentity({
      platformCode: ReportingPlatformEnum.PRMS,
      indicatorId: IndicatorsEnum.KNOWLEDGE_PRODUCT,
      evidence: [{ evidence_url: 'https://cgspace.cgiar.org/bitstream/x.pdf' }],
    });
    expect(resolution).toEqual({ identity: null, refused: false });
  });

  it('PRMS KP with undefined evidence: no identity, no dedup (evidence field defaults to undefined today)', () => {
    const resolution = resolveIncomingPublicationIdentity({
      platformCode: ReportingPlatformEnum.PRMS,
      indicatorId: IndicatorsEnum.KNOWLEDGE_PRODUCT,
    });
    expect(resolution).toEqual({ identity: null, refused: false });
  });

  it('PRMS KP with two handle-format entries: REFUSED — never resolves on the first handle found (AC.9, a defensive net: knowledge_product_summary.handle is a scalar, so production never actually feeds two)', () => {
    const resolution = resolveIncomingPublicationIdentity({
      platformCode: ReportingPlatformEnum.PRMS,
      indicatorId: IndicatorsEnum.KNOWLEDGE_PRODUCT,
      evidence: [
        { evidence_url: 'https://hdl.handle.net/10568/141764' },
        { evidence_url: 'https://hdl.handle.net/10568/222222' },
      ],
    });
    expect(resolution).toEqual({ identity: null, refused: true });
  });

  it('PRMS with indicator_id other than KNOWLEDGE_PRODUCT: no identity even with a qualifying handle (AC.5 / DC-10 — a cited handle is not this result’s identity)', () => {
    const resolution = resolveIncomingPublicationIdentity({
      platformCode: ReportingPlatformEnum.PRMS,
      indicatorId: IndicatorsEnum.INNOVATION_DEV,
      evidence: [{ evidence_url: 'https://hdl.handle.net/10568/141764' }],
    });
    expect(resolution).toEqual({ identity: null, refused: false });
  });

  it('PRMS with a missing indicatorId: treated as out of KP scope, no identity', () => {
    const resolution = resolveIncomingPublicationIdentity({
      platformCode: ReportingPlatformEnum.PRMS,
      indicatorId: null,
      evidence: [{ evidence_url: 'https://hdl.handle.net/10568/141764' }],
    });
    expect(resolution).toEqual({ identity: null, refused: false });
  });
});

describe('isHandleFormatIdentitySql', () => {
  it('normalizes the operand before testing it, never the raw column', () => {
    const sql = isHandleFormatIdentitySql('e.evidence_url');
    expect(sql).toContain('e.evidence_url');
    expect(sql).toContain('REGEXP');
    // The normalization pipeline (TRIM/scheme-strip/etc.) must run BEFORE the
    // BOOLEAN `REGEXP '<pattern>'` comparison operator, not the bare column —
    // a raw `https://hdl.handle.net/...` would never match a pattern with no
    // scheme in it otherwise. `indexOf('REGEXP')` alone also matches
    // `normalizedPublicLinkSql`'s internal `REGEXP_REPLACE` calls, so
    // `sql.indexOf('TRIM(')` (found) being "less than" that would pass even
    // with `-1` (not found) — i.e. even if the normalization were deleted
    // entirely, since `-1` is trivially less than any found index. Anchor to
    // the operator itself via the trailing quote only the boolean form
    // carries, and assert both indices are genuinely found.
    const trimIndex = sql.indexOf('TRIM(');
    const regexpOperatorIndex = sql.indexOf("REGEXP '");
    expect(trimIndex).toBeGreaterThan(-1);
    expect(regexpOperatorIndex).toBeGreaterThan(-1);
    expect(trimIndex).toBeLessThan(regexpOperatorIndex);
  });

  it('contains no literal question mark (mysql2 bind-placeholder risk)', () => {
    expect(isHandleFormatIdentitySql('e.evidence_url')).not.toContain('?');
  });

  it('carries no format-changing shorthand beyond the canonical digits pattern', () => {
    const sql = isHandleFormatIdentitySql('e.evidence_url');
    expect(sql).toContain('hdl');
    expect(sql).toContain('handle');
    expect(sql).toContain('net');
    expect(sql).toContain('[0-9]');
  });
});

/**
 * Rev-4 re-scoped assertion (design §3.1.1, tasks.md T-15 "⚠️ Rev-4
 * knock-on"). "SQL/in-memory equivalence" as rev 3 planned it is NOT a
 * property that exists: the stored side reads a `result_evidences` ROW, the
 * incoming side reads a `knowledge_product_summary.handle` payload SCALAR —
 * two different fields of two different systems, not one predicate applied
 * to one field twice.
 *
 * What IS a property of this code, and what this suite proves: for the SAME
 * raw handle string, the shared normalization + handle-format predicate
 * admits or rejects it IDENTICALLY whichever form evaluates it. The SQL
 * pattern is extracted straight out of `isHandleFormatIdentitySql`'s actual
 * runtime output (not re-derived from the shared source constant, which
 * would make this tautological) and unescaped exactly the way MySQL's
 * string-literal parser would before the regex engine ever sees it.
 *
 * What this suite does NOT and cannot prove: that the STORED evidence handle
 * and the INCOMING payload handle agree for any real result. That is a fact
 * about DATA, not about this code — measured baseline 2026-08-05: 277/277
 * live KP items — and it is T-14's job, not a unit test's.
 */
describe('stored-vs-incoming handle-format agreement (rev-4 re-scoped)', () => {
  const extractSqlPattern = (): RegExp => {
    const sql = isHandleFormatIdentitySql('x');
    const match = sql.match(/REGEXP '([^']+)'/);
    if (!match) {
      throw new Error(
        'isHandleFormatIdentitySql emitted no REGEXP literal to extract',
      );
    }
    // Undo the doubling `isHandleFormatIdentitySql` applies so the pattern
    // survives MySQL's string-literal parser (`\\.` -> one literal backslash
    // by the time the regex engine sees it).
    return new RegExp(match[1].replace(/\\\\/g, '\\'));
  };

  const samples: [string, boolean][] = [
    ['https://hdl.handle.net/10568/141764', true],
    ['http://www.hdl.handle.net/10568/141764/', true],
    ['hdl.handle.net/10568/141764', true],
    ['  HTTPS://HDL.HANDLE.NET/10568/141764  ', true],
    ['https://dx.doi.org/10568/141764', false],
    ['https://cgspace.cgiar.org/bitstream/x.pdf', false],
    ['https://hdl.handle.net/10568/abc', false],
    ['https://hdl.handle.net/10568', false],
  ];

  it.each(samples)(
    'agrees with the in-memory predicate for %s',
    (raw, expected) => {
      const sqlPattern = extractSqlPattern();
      const normalized = normalizeIdentityCandidate(raw);
      const sqlSideAdmits = normalized !== null && sqlPattern.test(normalized);

      expect(sqlSideAdmits).toBe(expected);
      expect(isHandleFormatIdentity(raw)).toBe(expected);
      expect(sqlSideAdmits).toBe(isHandleFormatIdentity(raw));
    },
  );
});

describe('publicLinkIdentityScopeSql', () => {
  it('scopes to TIP and AICCRA only, with no handle-format filter', () => {
    const sql = publicLinkIdentityScopeSql('r');
    expect(sql).toContain("r.platform_code IN ('TIP', 'AICCRA')");
    expect(sql).not.toContain('PRMS');
    // AC.6: no format filter on public_link — a filter here would drop the
    // 269 non-handle-format AICCRA rows measured to be in scope.
    expect(sql).not.toContain('REGEXP');
  });

  it('still excludes a blank/whitespace-only public_link', () => {
    const sql = publicLinkIdentityScopeSql('r');
    expect(sql).toContain('r.public_link IS NOT NULL');
    expect(sql).toContain("TRIM(r.public_link) <> ''");
  });

  it('honours the alias it is given', () => {
    expect(publicLinkIdentityScopeSql('x')).toContain(
      "x.platform_code IN ('TIP', 'AICCRA')",
    );
  });
});

describe('prmsHandleEvidenceScopeSql', () => {
  const sql = () =>
    prmsHandleEvidenceScopeSql({ resultAlias: 'r', evidenceAlias: 'e' });

  it('scopes to PRMS Knowledge Product results only (KP = 3, AC.5 / DC-10)', () => {
    expect(sql()).toContain("r.platform_code = 'PRMS'");
    expect(sql()).toContain(
      `r.indicator_id = ${IndicatorsEnum.KNOWLEDGE_PRODUCT}`,
    );
    expect(IndicatorsEnum.KNOWLEDGE_PRODUCT).toBe(3);
  });

  it('requires the principal evidence role (AC.3, negative case 1)', () => {
    expect(sql()).toContain('e.evidence_role_id = 1');
  });

  it('excludes private evidence through COALESCE (AC.3, negative case 2)', () => {
    expect(sql()).toContain('COALESCE(e.is_private, FALSE) = FALSE');
  });

  it('excludes inactive evidence through COALESCE (AC.3, negative case 3)', () => {
    expect(sql()).toContain('COALESCE(e.is_active, TRUE) = TRUE');
  });

  it('requires the handle format (AC.3, negative case 4)', () => {
    expect(sql()).toContain('REGEXP');
    expect(sql()).toContain('e.evidence_url');
  });

  it('honours the aliases it is given', () => {
    const custom = prmsHandleEvidenceScopeSql({
      resultAlias: 'res',
      evidenceAlias: 'ev',
    });
    expect(custom).toContain("res.platform_code = 'PRMS'");
    expect(custom).toContain('ev.evidence_role_id = 1');
  });
});

describe('PublicationIdentitySource', () => {
  it('has exactly the two sources R-RES-009 AC.4 asks the audit record to name', () => {
    expect(PublicationIdentitySource.PUBLIC_LINK).toBe('PUBLIC_LINK');
    expect(PublicationIdentitySource.HANDLE_EVIDENCE).toBe('HANDLE_EVIDENCE');
  });
});
