import { ReportingPlatformEnum } from '../../../entities/results/enum/reporting-platform.enum';

/** Parsed canonical form of a PRMS external reference (design §7.1). */
export interface ParsedPrmsRef {
  platform: ReportingPlatformEnum;
  code: number;
}

/**
 * Platforms whose PRMS reference is `<PLATFORM>-<code>`. STAR is bare only,
 * so it is not a prefix. Longest first: a future name that extends another
 * must win the `startsWith` check.
 */
const PREFIXED_PLATFORMS = (
  Object.values(ReportingPlatformEnum) as ReportingPlatformEnum[]
)
  .filter((platform) => platform !== ReportingPlatformEnum.STAR)
  .sort((left, right) => right.length - left.length);

/**
 * A positive safe integer with no leading zero.
 * `Number('007')` is `7` and `Number('9007199254740993')` is not a safe
 * integer — neither is a code this pair emits (design §7.1).
 */
const parseCanonicalCode = (text: string): number | null => {
  if (!/^[0-9]+$/.test(text)) {
    return null;
  }
  const code = Number(text);
  if (!Number.isSafeInteger(code) || String(code) !== text || code <= 0) {
    return null;
  }
  return code;
};

/**
 * PRMS `external_reference` for a `(platform, official code)` pair.
 * STAR stays the bare code; every other platform is `<PLATFORM>-<code>`.
 */
export const prmsRef = (
  platform: ReportingPlatformEnum,
  code: number | string,
): string => {
  const text = String(code);
  if (platform === ReportingPlatformEnum.STAR) {
    return text;
  }
  return `${platform}-${text}`;
};

/**
 * Inverse of `prmsRef`. Only the canonical forms `prmsRef` produces parse;
 * everything else is null.
 */
export const parsePrmsRef = (
  ref: string | null | undefined,
): ParsedPrmsRef | null => {
  if (typeof ref !== 'string' || ref === '') {
    return null;
  }
  for (const platform of PREFIXED_PLATFORMS) {
    const prefix = `${platform}-`;
    if (!ref.startsWith(prefix)) {
      continue;
    }
    const code = parseCanonicalCode(ref.slice(prefix.length));
    if (code === null) {
      return null;
    }
    return { platform, code };
  }
  const code = parseCanonicalCode(ref);
  if (code === null) {
    return null;
  }
  return { platform: ReportingPlatformEnum.STAR, code };
};

/**
 * The same reference as `prmsRef`, as one SQL CASE.
 *
 * Column expressions MUST be trusted literals — they are interpolated.
 * A NULL platform is STAR (`COALESCE`), matching the builder. STAR is the
 * bare code; every other `platform_code` is `CONCAT(platform, '-', code)`.
 */
export const prmsExternalReferenceSql = (
  platformColumn = 'platform_code',
  codeColumn = 'result_official_code',
): string => `CASE
  WHEN COALESCE(${platformColumn}, 'STAR') = 'STAR' THEN CAST(${codeColumn} AS CHAR)
  ELSE CONCAT(COALESCE(${platformColumn}, 'STAR'), '-', ${codeColumn})
END`;
