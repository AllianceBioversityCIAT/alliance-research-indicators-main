// @sdd-spec docs/specs/bugfix/bilateral-alliance-selector — T-01 / R-BAS-001, R-BAS-002, R-BAS-003
// @sdd-spec docs/specs/bugfix/w3-bilateral-funding-filter — T-01 / R-W3B-001
//
// Pure constants + functions only — no Nest injectables, no framework imports, no I/O.
// Single source of truth for bilateral project selection predicates (DD-1, DD-2, DD-3).

import { ClarisaProject } from '../dto/clarisa-project.types';

export const BILATERAL_FUNDING_PREFIX = 'BILATERAL';
/**
 * W3-family funding pattern (R-W3B-001, D-W3B-1).
 * Anchored so 'W3' does not admit 'W3X': stem WINDOW / WINDOWS / W, immediately
 * followed by '3' (optional single space before the digit — whitespace is
 * already collapsed by normalizeToken), then either end-of-string or a
 * RESTRICTED suffix separated by a dash with free spacing (mirrors the
 * existing BILATERAL- RESTRICTED suffix form).
 */
export const W3_FUNDING_PATTERN =
  /^(?:WINDOWS|WINDOW|W)\s?3(?:\s*-\s*RESTRICTED)?$/;
export const ALLIANCE_LEAD_ACRONYM_PREFIX = 'ABC';
export const ALLIANCE_CENTRE_ACRONYMS = ['CIAT', 'BIOVERSITY'] as const;
export const ALLIANCE_CENTRE_SET: ReadonlySet<string> = new Set(
  ALLIANCE_CENTRE_ACRONYMS,
);

/**
 * Normalizes a raw string token:
 * 1. Returns empty string if null, undefined, or empty/whitespace.
 * 2. Trims leading/trailing whitespace.
 * 3. Collapses internal whitespace sequences to a single space.
 * 4. Converts to upper case.
 */
export function normalizeToken(raw: string | null | undefined): string {
  if (raw === null || raw === undefined) {
    return '';
  }
  return raw.trim().replace(/\s+/g, ' ').toUpperCase();
}

/**
 * Checks whether a funding source is Bilateral or W3 (R-BAS-001, R-W3B-001, DD-2, D-W3B-1).
 * True when the upper-cased, whitespace-collapsed string starts with 'BILATERAL',
 * or matches the anchored W3-family pattern (see W3_FUNDING_PATTERN).
 * Null, undefined, or blank returns false.
 */
export function isBilateralFunding(
  funding: string | null | undefined,
): boolean {
  const normalized = normalizeToken(funding);
  if (!normalized) {
    return false;
  }
  return (
    normalized.startsWith(BILATERAL_FUNDING_PREFIX) ||
    W3_FUNDING_PATTERN.test(normalized)
  );
}

/**
 * Checks whether a project is Alliance-led (R-BAS-002, DD-3).
 * Evaluated per project:
 * 1. If source_center_acronym is present and non-blank, it is Alliance if and only if
 *    its normalized value is in {'CIAT', 'BIOVERSITY'}. lead_institution_object is NOT consulted.
 * 2. Otherwise, falls back to lead_institution_object.acronym: true if normalized acronym
 *    is 'ABC' or starts with 'ABC' followed by a non-alphanumeric character (e.g. 'ABC - Bioversity (Alliance)').
 */
export function isAllianceProject(
  project:
    | Pick<ClarisaProject, 'source_center_acronym' | 'lead_institution_object'>
    | null
    | undefined,
): boolean {
  if (!project) {
    return false;
  }

  const normalizedCenter = normalizeToken(project.source_center_acronym);
  if (normalizedCenter !== '') {
    return ALLIANCE_CENTRE_SET.has(normalizedCenter);
  }

  const normalizedLeadAcronym = normalizeToken(
    project.lead_institution_object?.acronym,
  );
  if (!normalizedLeadAcronym) {
    return false;
  }

  return /^ABC([^A-Z0-9]|$)/.test(normalizedLeadAcronym);
}

/**
 * Checks whether a project matches the target phase (R-BAS-003).
 * Returns true if phase is absent, null, undefined, or blank.
 * Otherwise returns true if the numeric representation equals targetPhase.
 */
export function matchesPhase(
  phase: string | number | null | undefined,
  targetPhase: number,
): boolean {
  if (phase === null || phase === undefined) {
    return true;
  }

  if (typeof phase === 'string' && phase.trim() === '') {
    return true;
  }

  const numericPhase = Number(phase);
  if (Number.isNaN(numericPhase)) {
    return false;
  }

  return numericPhase === targetPhase;
}
