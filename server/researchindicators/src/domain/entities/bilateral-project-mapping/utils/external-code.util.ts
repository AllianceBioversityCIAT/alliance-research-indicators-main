// @sdd-spec docs/specs/bilateral/clarisa-project-automapping — T-03 / R-CPA-003 (DD-4, DD-7)
//
// Pure constants + functions only — no Nest injectables, no framework imports.
// Single source of truth for external_code normalization and collision detection (DD-4).

export type NormalizationRule = 'NONE' | 'STRIP_CENTRE_PREFIX';

export interface NormalizedExternalCode {
  normalized: string;
  rule: NormalizationRule;
}

/**
 * Closed set of leading centre prefixes stripped during normalization (DD-4, R-CPA-003).
 * Closed set by design: unknown prefixes like 'X-' must pass through unchanged
 * to avoid converting unresolved codes into silent false-positive matches.
 */
export const KNOWN_CENTRE_PREFIXES = ['B-', 'C-'] as const;

/**
 * Normalizes a raw external code:
 * 1. Trim whitespace
 * 2. Upper-case
 * 3. Strip a leading prefix ONLY if in the closed set {'B-', 'C-'}
 * 4. Strip at most once
 */
export function normalizeExternalCode(
  raw: string | null | undefined,
): NormalizedExternalCode {
  if (raw === null || raw === undefined) {
    return { normalized: '', rule: 'NONE' };
  }

  const trimmed = raw.trim().toUpperCase();
  if (!trimmed) {
    return { normalized: '', rule: 'NONE' };
  }

  for (const prefix of KNOWN_CENTRE_PREFIXES) {
    if (trimmed.startsWith(prefix)) {
      return {
        normalized: trimmed.slice(prefix.length),
        rule: 'STRIP_CENTRE_PREFIX',
      };
    }
  }

  return {
    normalized: trimmed,
    rule: 'NONE',
  };
}

export interface ProjectExternalCodeEntry {
  projectId: number | string;
  externalCode?: string | null;
}

export interface CodeCollision {
  normalizedCode: string;
  projectIds: (number | string)[];
}

export interface CollisionDetectionResult {
  collisionCount: number;
  collisions: CodeCollision[];
  collidingCodes: string[];
  /** Map of normalizedCode -> distinct projectIds */
  normalizedMap: Map<string, (number | string)[]>;
}

/**
 * Given a list of { projectId, externalCode }, detects any normalized codes
 * that map to more than one distinct project (i.e. collision).
 */
export function detectExternalCodeCollisions(
  projects: readonly ProjectExternalCodeEntry[],
): CollisionDetectionResult {
  const normalizedMap = new Map<string, (number | string)[]>();

  for (const item of projects) {
    if (
      !item.externalCode ||
      item.projectId === undefined ||
      item.projectId === null
    ) {
      continue;
    }

    const { normalized } = normalizeExternalCode(item.externalCode);
    if (!normalized) continue;

    const existing = normalizedMap.get(normalized);
    if (existing) {
      if (!existing.includes(item.projectId)) {
        existing.push(item.projectId);
      }
    } else {
      normalizedMap.set(normalized, [item.projectId]);
    }
  }

  const collisions: CodeCollision[] = [];
  const collidingCodes: string[] = [];

  for (const [normalizedCode, projectIds] of normalizedMap.entries()) {
    if (projectIds.length > 1) {
      collisions.push({ normalizedCode, projectIds });
      collidingCodes.push(normalizedCode);
    }
  }

  return {
    collisionCount: collisions.length,
    collisions,
    collidingCodes,
    normalizedMap,
  };
}

/**
 * Checks whether a normalized code is ambiguous (belongs to a collision).
 */
export function isAmbiguousNormalizedCode(
  normalizedCode: string,
  collisionInfo: CollisionDetectionResult,
): boolean {
  if (!normalizedCode || !collisionInfo) return false;
  return collisionInfo.collidingCodes.includes(normalizedCode);
}
