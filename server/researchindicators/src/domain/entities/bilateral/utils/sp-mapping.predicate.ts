// @sdd-spec docs/specs/bugfix/pool-funding-sp-picker-empty — T-02 / R-PSP-001, R-PSP-003, D-PSP-2
//
// Pure constants + functions only — no Nest injectables, no framework imports, no I/O.
// Single source of truth for Science Program mapping row validation in CLARISA projects.

export const DEFAULT_ACCEPTED_SP_STATUSES = ['Confirmed', 'Pending'] as const;

export const DEFAULT_ACCEPTED_SP_STATUS_SET: ReadonlySet<string> = new Set(
  DEFAULT_ACCEPTED_SP_STATUSES,
);

/**
 * Parses a raw comma-separated environment string into a Set of accepted statuses (R-PSP-001, D-PSP-2).
 * Falls back to DEFAULT_ACCEPTED_SP_STATUS_SET when unset, empty, or whitespace.
 */
export function parseAcceptedSpStatuses(raw?: string | null): Set<string> {
  if (!raw || !raw.trim()) {
    return new Set(DEFAULT_ACCEPTED_SP_STATUSES);
  }
  const tokens = raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  return tokens.length > 0
    ? new Set(tokens)
    : new Set(DEFAULT_ACCEPTED_SP_STATUSES);
}

/**
 * Checks whether a CLARISA mapping row status is in the accepted set (R-PSP-001, R-PSP-003).
 */
export function isAcceptedSpStatus(
  status: string | null | undefined,
  acceptedStatuses:
    | ReadonlySet<string>
    | Set<string> = DEFAULT_ACCEPTED_SP_STATUS_SET,
): boolean {
  if (!status) {
    return false;
  }
  return acceptedStatuses.has(status.trim());
}

export interface SpMappingRowLike {
  status?: string | null;
  allocation?: number | null;
  global_unit_object?: {
    smo_code?: string | null;
    name?: string | null;
    cgiar_entity_type_object?: {
      prefix?: string | null;
      code?: number | null;
      name?: string | null;
    } | null;
    portfolio_object?: {
      acronym?: string | null;
    } | null;
  } | null;
}

/**
 * Checks whether a CLARISA project mapping row represents an accepted Science Program
 * for the bilateral picker / ToC catalog (R-PSP-001, R-PSP-003).
 *
 * Four clauses:
 * 1. smo_code present AND status in acceptedStatuses (default Confirmed, Pending).
 * 2. portfolio_object.acronym equals activePortfolio (default P25).
 * 3. prefix is not 'AOW'.
 * 4. smo_code matches /^SP\d/i.
 */
export function isProjectScienceProgramMapping(
  mapping: SpMappingRowLike | null | undefined,
  activePortfolio: string,
  acceptedStatuses:
    | ReadonlySet<string>
    | Set<string> = DEFAULT_ACCEPTED_SP_STATUS_SET,
): boolean {
  if (!mapping) {
    return false;
  }
  const u = mapping.global_unit_object;
  if (!u?.smo_code || !isAcceptedSpStatus(mapping.status, acceptedStatuses)) {
    return false;
  }
  if (u.portfolio_object?.acronym !== activePortfolio) {
    return false;
  }
  const prefix = u.cgiar_entity_type_object?.prefix?.toUpperCase();
  if (prefix === 'AOW') {
    return false;
  }
  return /^SP\d/i.test(u.smo_code.trim());
}
