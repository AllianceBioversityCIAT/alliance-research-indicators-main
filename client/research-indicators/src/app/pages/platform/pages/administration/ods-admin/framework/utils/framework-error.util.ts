/**
 * One display message from a strategy-framework error (design §2.1, P-36).
 *
 * The page passes `MainResponse.errorDetail`, which is the HTTP body
 * (`to-promise.service`). That body is one of:
 * - the domain object `{ description, field?, blockers? }`
 * - a plain string
 * - Nest's DTO-validation string array
 * - the envelope `{ description: '<Exception name>', errors: <one of the above> }`
 *
 * Framework errors are not routed through `ActionsService.handleBadRequest`:
 * its conflict branch matches this payload and renders the result-title alert.
 *
 * @akili-spec institutional-performance/strategy-framework T-12
 */

const FALLBACK = 'The framework could not be loaded. Please try again.';

const textOf = (value: unknown): string | null => {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed === '' ? null : trimmed;
  }
  if (Array.isArray(value)) {
    const parts = value.map(item => (typeof item === 'string' ? item.trim() : '')).filter(part => part !== '');
    return parts.length === 0 ? null : parts.join(' ');
  }
  if (value !== null && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    if ('errors' in record) {
      const fromErrors = textOf(record['errors']);
      if (fromErrors) return fromErrors;
    }
    if (typeof record['description'] === 'string') {
      const trimmed = record['description'].trim();
      if (trimmed !== '') return trimmed;
    }
  }
  return null;
};

/** One display message. Never throws. */
export function frameworkErrorOf(errorDetail: unknown): string {
  return textOf(errorDetail) ?? FALLBACK;
}
