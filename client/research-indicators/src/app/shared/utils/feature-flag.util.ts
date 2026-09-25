/**
 * R-PFT-003 / D-2. Trim the value and lowercase it. The feature is disabled if
 * and only if that result equals `false`. Every other input — missing, null,
 * empty, whitespace, `0`, `no`, `off`, any unrecognised string — is enabled.
 *
 * The enabled result is the inequality itself, not a catch. There is one way
 * to turn the feature off, and it must be written deliberately.
 */
export function isFeatureFlagEnabled(value: string | null | undefined): boolean {
  return value?.trim().toLowerCase() !== 'false';
}
