/**
 * Truncates a request URL at the PRMS callback route prefix.
 *
 * The credential is the path segment after `/api/prms-callback`. The prefix
 * comparison is case-insensitive so it matches Express's default routing
 * (`case sensitive routing` is off). It never keys on the credential's value
 * and reads no environment variable, so the segment is still removed when
 * the variable is unset, rotated, or empty. Any other URL is returned
 * unchanged.
 */
export const PRMS_CALLBACK_ROUTE_PREFIX = '/api/prms-callback';

/**
 * The two alphabets below are deliberately different, and conflating them is
 * what a reader is most likely to get wrong.
 *
 * `SECRET_CHARS` is the **credential's grammar**, fixed by C-T08. The secret is
 * ours — we mint it and embed it in `ARI_PRMS_WEBHOOK_CALLBACK_URL` before
 * registering that URL with PRMS — so it is the set of characters a real
 * credential can be made of, and nothing may be added to it without amending
 * C-T08. It is what decides where a *segment* ends (`SEGMENT_END`).
 *
 * `PATH_CHARS` is the **scanner's reach**: how far the redactor is willing to
 * consume while looking for the end of a path token it is about to drop. It may
 * safely be a superset of the credential's grammar, because over-consuming
 * inside a token that is being discarded costs nothing — provided it never
 * includes ordinary sentence punctuation (`. , ; : ! ? ) ] '`), which would make
 * the scanner eat the surrounding diagnostic. `%` is not sentence punctuation:
 * it only appears here as percent-encoding, so a percent-encoded guess is
 * consumed whole instead of leaving a tail in an unmatched-route message
 * (R-PWH-004 AC.7). It is in the scanner's reach, never in the credential's.
 */
const SECRET_CHARS = 'A-Za-z0-9_\\-';

/**
 * The secret's alphabet plus the segment separator and the percent-encoding
 * marker. See the note above for why `%` belongs here and not in `SECRET_CHARS`.
 */
const PATH_CHARS = `${SECRET_CHARS}/%`;

/**
 * The delimiters a host cannot carry. Shared by both authority patterns so the
 * embedded form and the anchored form agree on where a host ends.
 */
const AUTHORITY_END = `[^\\s/?#"'<>]*`;

/**
 * An optional scheme followed by `//host`. No site wrapped by this util is
 * known to produce an absolute URL — `request.url` under Express is always
 * origin-form — but a missed absolute form returns the whole credential, so the
 * authority is recognised rather than assumed away.
 */
const URL_AUTHORITY = `(?:[A-Za-z][A-Za-z0-9+.\\-]*:)?//${AUTHORITY_END}`;

/**
 * The prefix must end a path segment. Without this, `/api/prms-callbacks/x`
 * — a different route — would be truncated as if it were the callback.
 */
const SEGMENT_END = `(?![${SECRET_CHARS}])`;

/**
 * The whole URL *is* a callback reference: the prefix opens the path, either
 * directly or after an authority.
 */
const ANCHORED_CALLBACK_URL = new RegExp(
  `^(${URL_AUTHORITY})?${PRMS_CALLBACK_ROUTE_PREFIX}${SEGMENT_END}`,
  'i',
);

/**
 * A callback reference embedded in free text. The lookbehind is what separates
 * a real reference from a path that merely contains the string: the prefix must
 * open a path (start of text, or a character no path can carry) or follow an
 * authority. `/api/results/compare/api/prms-callback/x` satisfies neither.
 *
 * The lookbehind reads `PATH_CHARS`, so a `%` directly before the prefix also
 * reads as mid-path and is left alone. That is the intended reading: Express
 * matches the callback route on the raw path, so a path that does not literally
 * start with the prefix never carried the credential in the first place.
 */
const EMBEDDED_CALLBACK_URL = new RegExp(
  `(?<=^|[^${PATH_CHARS}]|//${AUTHORITY_END})` +
    `${PRMS_CALLBACK_ROUTE_PREFIX}${SEGMENT_END}[${PATH_CHARS}]*`,
  'gi',
);

export function redactCallbackPath(url: string): string {
  if (typeof url !== 'string' || url.length === 0) {
    return url;
  }

  const match = ANCHORED_CALLBACK_URL.exec(url);

  if (!match) {
    return url;
  }

  return `${match[1] ?? ''}${PRMS_CALLBACK_ROUTE_PREFIX}`;
}

/**
 * Removes a callback-prefixed URL embedded in an exception message or stack.
 *
 * Nest's unmatched-route handler throws `Cannot <METHOD> <full-url>`, and that
 * string is also the first line of the stack. Every path character after the
 * prefix is dropped; everything else survives byte for byte, because the token
 * stops at the first character outside `PATH_CHARS` — the scanner's reach —
 * rather than guessing where the surrounding text resumes.
 */
export function redactCallbackDiagnostics(value: string): string {
  if (typeof value !== 'string' || value.length === 0) {
    return value;
  }

  if (!value.toLowerCase().includes(PRMS_CALLBACK_ROUTE_PREFIX)) {
    return value;
  }

  return value.replace(EMBEDDED_CALLBACK_URL, PRMS_CALLBACK_ROUTE_PREFIX);
}
