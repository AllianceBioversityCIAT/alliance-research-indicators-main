import { PLATFORM_CODES, PlatformCode } from '@shared/constants/platform-codes';

// Single, case-sensitive source of truth for code→platform derivation (design.md
// §2.2, DD-4). A known platform prefix resolves to that platform — "TIP-31288" and
// equally "STAR-31288"; STAR is matched by prefix here, not only via the numeric
// fallback below. A bare-numeric code ("31288") resolves to STAR (the
// `numeric ⟺ STAR` invariant, OQ-1). Anything else — an unrecognized prefix, a
// differently-cased prefix — is genuinely unknown and returns `null`. This is
// exactly what `result.interceptor.ts`'s original alternation regex matched
// (case-sensitive, `null` for anything it didn't recognize): the derivation moved
// here (DD-4), it did not widen what it accepts.
export function platformFromResultCodeOrNull(code: string): PlatformCode | null {
  // Check every platform's prefix, INCLUDING STAR — the original alternation
  // matched "STAR-31288" as a prefix too (it built its regex from all of
  // PLATFORM_CODES, not just the non-STAR members). Skipping STAR here caused a
  // real divergence: "/result/STAR-31288" resolved to STAR before this refactor
  // and to null after, until caught by the mandated old-vs-new comparison.
  for (const platform of Object.values(PLATFORM_CODES)) {
    if (code.startsWith(`${platform}-`)) return platform;
  }
  if (/^\d+$/.test(code)) return PLATFORM_CODES.STAR;
  return null;
}

// The guard-facing wrapper (bilateral.service.ts :: getAlignment). Unlike the
// interceptor, the guard must always resolve to SOME platform: an
// unrecognized/malformed code defaults to STAR — the safe direction (D-1), since
// defaulting to "capable" preserves today's behavior for a result code the guard
// has never had to classify before, rather than newly suppressing a possibly
// legitimate request.
export function platformFromResultCode(code: string): PlatformCode {
  return platformFromResultCodeOrNull(code) ?? PLATFORM_CODES.STAR;
}

// R-PFG-002 — the eligible-source set is data, not a hardcoded identity check.
// Named via PLATFORM_CODES (DD-2: no bare 'STAR' string literal at the call
// sites). Today: STAR alone. Enabling TIP later is a one-element edit here.
export const POOL_FUNDING_PLATFORMS: readonly PlatformCode[] = [PLATFORM_CODES.STAR];

export function isPoolFundingCapable(code: string): boolean {
  return POOL_FUNDING_PLATFORMS.includes(platformFromResultCode(code));
}
