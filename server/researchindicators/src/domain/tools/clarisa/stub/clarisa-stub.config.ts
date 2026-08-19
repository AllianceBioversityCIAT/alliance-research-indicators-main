/**
 * Flag parsing + mount-prefix constant for the CLARISA fixture stub.
 *
 * [SPEC bilateral/clarisa-fixture-stub] T-05.
 *
 * Default-deny by construction (R-CFS-004): `ARI_CLARISA_STUB_ENABLED` is treated as enabled
 * ONLY for the exact literal string `'true'` — the same convention `ENV.validateEnvBoolean`
 * uses elsewhere in this codebase (`domain/shared/utils/env.utils.ts`). Unset, blank, and any
 * unrecognised value (e.g. `maybe`) all fall through to `false`. There is no "enabled by
 * absence" path, and no other spelling (`1`, `yes`, `TRUE`) is honored — a stray value must
 * fail closed, not be guessed at.
 *
 * `isClarisaStubEnabled` takes the raw value as an optional parameter (defaulting to a live
 * read of `process.env.ARI_CLARISA_STUB_ENABLED`) purely so the router spec can drive all
 * three named flag states — unset, truthy, unrecognised — without mutating `process.env`
 * for every case.
 *
 * Removal condition (verbatim — grepped in three places; do not paraphrase or wrap it):
 * when CLARISA publishes external_code and phase-2026 data, unset the flag and delete the stub, fixture, dictionary, reference capture and converter; do not maintain them
 */

/** Only this exact literal means "enabled". Everything else — including unset — is disabled. */
const ENABLED_VALUE = 'true';

/**
 * Mount prefix the stub's two routes are served under once T-06 wires
 * `app.use(CLARISA_STUB_MOUNT_PREFIX, createClarisaStubRouter())` into `main.ts`, ahead of the
 * Nest pipeline (DD-1). Not consumed by this task — declared here so T-06 has one source of
 * truth for it instead of re-typing the string.
 */
export const CLARISA_STUB_MOUNT_PREFIX = '/api/clarisa-stub';

/**
 * Default-deny predicate for the stub's env gate (R-CFS-004 AC.1–AC.3). Pass an explicit
 * `rawValue` in tests to exercise all three named states without touching `process.env`;
 * omit it in production code to read the live environment.
 */
export function isClarisaStubEnabled(
  rawValue: string | undefined = process.env.ARI_CLARISA_STUB_ENABLED,
): boolean {
  return rawValue === ENABLED_VALUE;
}
