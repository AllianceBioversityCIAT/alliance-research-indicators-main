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
  isHandleFormatIdentity,
  normalizeIdentityCandidate,
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
