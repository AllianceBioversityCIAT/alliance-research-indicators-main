// @akili-spec changes/agresso-staff-deactivation (T-07 — R-AGD-011, R-AGD-012)
import { AppConfigKey } from '../../../../entities/app-config/enum/app-config-key.enum';

/**
 * Seed value of `ARI_STAFF_DEACTIVATION_EXTERNAL_STATUS_ID`.
 *
 * Documented default for the key's absence: the migration writes this number.
 * It is not a runtime source. A missing or unreadable key aborts C-4; nothing
 * in the resolver substitutes this constant, and `resolveExternalStatusId`
 * selects only the id the resolver returned.
 */
export const EXTERNAL_STATUS_ID = 4;

/** Loud-key failure. `dryRun` is absent here: that key fails safe and never aborts. */
export interface DeactivationConfigFailure {
  key: AppConfigKey;
  abortReason: 'C-3' | 'C-4';
}

/**
 * One read of the four staff-deactivation keys.
 *
 * A loud key that did not resolve is `null` here and listed in `failures`.
 * `dryRun` is always a boolean: an unreadable value is `true` (enabled).
 */
export interface DeactivationConfigDto {
  dryRun: boolean;
  ceilingFraction: number | null;
  absoluteFloor: number | null;
  externalStatusId: number | null;
}

export interface DeactivationConfigResolution {
  config: DeactivationConfigDto;
  /** Table order: ceiling, floor, then external status. Empty when every loud key resolved. */
  failures: DeactivationConfigFailure[];
}
