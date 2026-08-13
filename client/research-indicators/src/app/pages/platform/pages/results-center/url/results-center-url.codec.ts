import type { ParamMap } from '@angular/router';

import {
  CanonicalParamName,
  foldParamName,
  INDICATOR_ID_TO_SLUG,
  INDICATOR_SLUG_TO_ID,
  MAX_LIST_PARAM_VALUES,
  MAX_PARAM_TOKEN_LENGTH,
  PLATFORM_CODE_TO_SOURCE_SLUG,
  RECOGNIZED_PARAM_NAMES,
  SOURCE_SLUG_TO_PLATFORM_CODE,
  STATUS_ID_TO_SLUG,
  STATUS_SLUG_TO_ID,
  TabScope,
  TAB_SCOPE_VALUES,
} from './results-center-url.vocabulary';

/**
 * results-center-url.codec.ts
 *
 * Pure `URL ⇄ filter state` translation for the Results Center
 * (docs/specs/results-center/url-filters/design.md §2.1, D-URL-1). Exports
 * both directions: `parse` (T-02 of tasks.md, `URL → state`) and `serialize`
 * (T-03, `state → URL params`, appended below without restructuring `parse`).
 *
 * **Purity contract**, mirrored from the server's
 * `capdev-recipients.builder.ts` (design §2): no DI, no `Router`, no
 * signals, no logging, no toasts. Anything this module rejects is *returned*
 * in `dropped` — the caller (a future `ResultsCenterComponent`, T-06) decides
 * what to do about it (a toast naming counts, per D-URL-4). This module never
 * decides that for itself.
 */

// ---------------------------------------------------------------------------
// Public shapes
// ---------------------------------------------------------------------------

/**
 * The resolved, typed filter values a caller can seed straight into
 * `ResultsCenterService` state (T-04). Absent keys mean "not present in the
 * URL" — never an empty array — so a caller can tell "no filter" from
 * "filter present but every value was invalid" (the latter still surfaces
 * via `dropped`).
 */
export interface ResultsCenterUrlFilters {
  /** `indicator-codes-tabs` — single id (D-URL-12). */
  readonly indicator?: number;
  /** `contract-codes` — upper-cased `agreement_id` values, order preserved. */
  readonly contract?: string[];
  /** `status-codes` — resolved `result_status_id` values, order preserved. */
  readonly status?: number[];
  /** `years` — integers in `[2000, 2100]`, order preserved. */
  readonly year?: number[];
  /** `platform-code` — upper-cased platform codes, order preserved. */
  readonly source?: string[];
}

/**
 * One token this module declined to apply, and why. Never rendered
 * verbatim to the user (D-URL-4: the toast names counts, not values) — this
 * shape exists so a caller/test can prove *which* token was dropped, not
 * merely that something was (design §10.3 disqualifier).
 */
export interface DroppedUrlToken {
  /** The folded canonical or legacy parameter name the token belonged to. */
  readonly param: string;
  /** The raw offending value — or the whole raw list, comma-joined, when the parameter was dropped as a whole. */
  readonly value: string;
  readonly reason: 'invalid-value' | 'too-long' | 'too-many-values';
}

/**
 * The minimal `filters` + `scope` pair `serialize` (T-03) will accept as
 * input, so a round-trip is `parse(serialize(state))`.
 */
export interface ResultsCenterUrlState {
  readonly filters: ResultsCenterUrlFilters;
  /**
   * `undefined` means the URL carried no explicit `tab` value — the caller
   * resolves the pinned-tab preference in that case (design §6.1 step 3);
   * this module never guesses at it.
   */
  readonly scope: TabScope | undefined;
}

export interface ParsedResultsCenterUrl extends ResultsCenterUrlState {
  readonly dropped: DroppedUrlToken[];
  /**
   * `true` when at least one recognized parameter name (canonical or
   * legacy, folded) was present in the URL — regardless of whether its
   * value was valid. Presence, not validity, is what suppresses session
   * restore (R-RCU-004) and what makes a wholly invalid link still count as
   * explicit navigation intent (R-RCU-005).
   */
  readonly hadRecognizedParam: boolean;
}

// ---------------------------------------------------------------------------
// Natural-key validation (design §5.4 — these predicates belong to T-02, not T-01)
// ---------------------------------------------------------------------------

/** `agreement_id` shape. Not existence-validated against a control list (D-URL-7). */
const CONTRACT_PATTERN = /^[A-Za-z0-9._-]{1,32}$/;

const YEAR_MIN = 2000;
const YEAR_MAX = 2100;
const YEAR_PATTERN = /^\d+$/;

// ---------------------------------------------------------------------------
// Key folding + repeated-key flattening (design §6.1 steps 1-2)
// ---------------------------------------------------------------------------

/**
 * Groups every key actually present on `paramMap` by its folded name.
 * `queryParamMap.get()/getAll()` are case-sensitive, so a raw `getAll` under
 * the canonical spelling misses `?CONTRACT=…` entirely (R2-6) — this is the
 * fold step design §6.1 step 1 requires, applied once up front so every
 * resolver below can look values up by folded name without re-scanning
 * `paramMap.keys` per parameter.
 */
function groupKeysByFoldedName(paramMap: ParamMap): Map<string, string[]> {
  const groups = new Map<string, string[]>();
  for (const key of paramMap.keys) {
    const folded = foldParamName(key);
    const bucket = groups.get(folded);
    if (bucket) {
      bucket.push(key);
    } else {
      groups.set(folded, [key]);
    }
  }
  return groups;
}

/**
 * Every raw value for a folded parameter name, in the order the underlying
 * keys were read via `getAll()` — so a repeated key (`?contract=A100&contract=S192`)
 * combines rather than silently losing all but the first occurrence
 * (R-RCU-005 AC.4), and a case-varied repeat (`?CONTRACT=…&contract=…`)
 * still combines because both raw keys fold to the same group.
 */
function rawValuesFor(paramMap: ParamMap, groups: Map<string, string[]>, foldedName: string): string[] {
  const keys = groups.get(foldedName);
  if (!keys || keys.length === 0) return [];
  const values: string[] = [];
  for (const key of keys) {
    values.push(...paramMap.getAll(key));
  }
  return values;
}

/**
 * Splits multi-value raw strings on `,` and flattens, preserving the order
 * values appeared in (R-RCU-002 multi-value scenario, "AND IT MUST preserve
 * the order"). Blank tokens (an empty segment from a stray comma) are
 * silently skipped — they are not a value to report as dropped, the same
 * way an absent parameter is not.
 */
function splitMultiValue(rawValues: string[]): string[] {
  const tokens: string[] = [];
  for (const raw of rawValues) {
    for (const token of raw.split(',')) {
      const trimmed = token.trim();
      if (trimmed.length > 0) {
        tokens.push(trimmed);
      }
    }
  }
  return tokens;
}

// ---------------------------------------------------------------------------
// Multi-value resolution (contract, status, year, source) — design §5.5
// ---------------------------------------------------------------------------

/**
 * Applies the two bounds (§5.5) and per-token resolution to a multi-value
 * parameter, in that order:
 *
 * 1. **Count bound** — more than `MAX_LIST_PARAM_VALUES` (50) tokens drops
 *    the whole parameter, before any individual token is even inspected.
 * 2. **Length bound** — any single token over `MAX_PARAM_TOKEN_LENGTH` (64)
 *    is dropped individually; the rest of the list still applies.
 * 3. **`resolveToken`** — the param-specific validation/lookup. An
 *    unresolvable token is dropped individually; the rest still applies
 *    (R-RCU-005 AC.1's "one bad token" philosophy, applied within a list
 *    too, not only across parameters).
 *
 * Returns `undefined` (never an empty array) when nothing survives, so a
 * caller can tell "parameter absent/fully rejected" from "parameter present
 * with values".
 */
function resolveMultiValueParam<T>(
  paramName: CanonicalParamName,
  tokens: string[],
  dropped: DroppedUrlToken[],
  resolveToken: (token: string) => T | undefined,
): T[] | undefined {
  if (tokens.length === 0) return undefined;

  if (tokens.length > MAX_LIST_PARAM_VALUES) {
    dropped.push({ param: paramName, value: tokens.join(','), reason: 'too-many-values' });
    return undefined;
  }

  const resolved: T[] = [];
  for (const token of tokens) {
    if (token.length > MAX_PARAM_TOKEN_LENGTH) {
      dropped.push({ param: paramName, value: token, reason: 'too-long' });
      continue;
    }
    const value = resolveToken(token);
    if (value === undefined) {
      dropped.push({ param: paramName, value: token, reason: 'invalid-value' });
      continue;
    }
    resolved.push(value);
  }

  return resolved.length > 0 ? resolved : undefined;
}

function resolveContractToken(token: string): string | undefined {
  const upper = token.toUpperCase();
  return CONTRACT_PATTERN.test(upper) ? upper : undefined;
}

function resolveYearToken(token: string): number | undefined {
  if (!YEAR_PATTERN.test(token)) return undefined;
  const year = Number(token);
  return year >= YEAR_MIN && year <= YEAR_MAX ? year : undefined;
}

function resolveStatusToken(token: string): number | undefined {
  return STATUS_SLUG_TO_ID.get(token.toLowerCase());
}

function resolveSourceToken(token: string): string | undefined {
  return SOURCE_SLUG_TO_PLATFORM_CODE.get(token.toLowerCase());
}

// ---------------------------------------------------------------------------
// indicator — single-value (D-URL-12)
// ---------------------------------------------------------------------------

/**
 * `indicator` is single-value: the tab strip holds exactly one id. A comma
 * is an invalid token, rejected outright — never truncated to the tokens
 * before the first comma (D-URL-12). A repeated key is the same kind of
 * ambiguity (which value wins?) and is rejected the same way, not
 * truncated to the first occurrence either.
 */
function resolveIndicatorValue(
  rawValues: string[],
  dropped: DroppedUrlToken[],
): number | undefined {
  if (rawValues.length === 0) return undefined;

  if (rawValues.length > 1) {
    dropped.push({ param: 'indicator', value: rawValues.join(','), reason: 'invalid-value' });
    return undefined;
  }

  const raw = rawValues[0];

  if (raw.length > MAX_PARAM_TOKEN_LENGTH) {
    dropped.push({ param: 'indicator', value: raw, reason: 'too-long' });
    return undefined;
  }

  if (raw.includes(',')) {
    dropped.push({ param: 'indicator', value: raw, reason: 'invalid-value' });
    return undefined;
  }

  const id = INDICATOR_SLUG_TO_ID.get(raw.toLowerCase());
  if (id === undefined) {
    dropped.push({ param: 'indicator', value: raw, reason: 'invalid-value' });
    return undefined;
  }

  return id;
}

/**
 * Legacy `indicatorTab=<id>` (R-RCU-006) already carries the numeric
 * database id directly — there is no slug to resolve, only membership in
 * the known id set, so an id the vocabulary does not recognize degrades via
 * R-RCU-005 rather than resolving to a wrong tab.
 */
function resolveLegacyIndicatorTab(
  rawValues: string[],
  dropped: DroppedUrlToken[],
): number | undefined {
  if (rawValues.length === 0) return undefined;

  const raw = rawValues[0];
  const isSingleNumericToken = rawValues.length === 1 && YEAR_PATTERN.test(raw);
  if (!isSingleNumericToken || raw.length > MAX_PARAM_TOKEN_LENGTH) {
    dropped.push({ param: 'indicatortab', value: rawValues.join(','), reason: 'invalid-value' });
    return undefined;
  }

  const id = Number(raw);
  if (!INDICATOR_ID_TO_SLUG.has(id)) {
    dropped.push({ param: 'indicatortab', value: raw, reason: 'invalid-value' });
    return undefined;
  }

  return id;
}

/**
 * Legacy `statusTab=<id>` — same shape as {@link resolveLegacyIndicatorTab}:
 * a raw numeric database id, validated against the known id set, never a
 * slug lookup.
 */
function resolveLegacyStatusTab(
  rawValues: string[],
  dropped: DroppedUrlToken[],
): number[] | undefined {
  if (rawValues.length === 0) return undefined;

  const raw = rawValues[0];
  const isSingleNumericToken = rawValues.length === 1 && YEAR_PATTERN.test(raw);
  if (!isSingleNumericToken || raw.length > MAX_PARAM_TOKEN_LENGTH) {
    dropped.push({ param: 'statustab', value: rawValues.join(','), reason: 'invalid-value' });
    return undefined;
  }

  const id = Number(raw);
  if (!STATUS_ID_TO_SLUG.has(id)) {
    dropped.push({ param: 'statustab', value: raw, reason: 'invalid-value' });
    return undefined;
  }

  return [id];
}

// ---------------------------------------------------------------------------
// tab — my/all scope (design §5.4/§6.1 step 3)
// ---------------------------------------------------------------------------

function resolveScope(rawValues: string[], dropped: DroppedUrlToken[]): TabScope | undefined {
  if (rawValues.length === 0) return undefined;

  if (rawValues.length > 1) {
    dropped.push({ param: 'tab', value: rawValues.join(','), reason: 'invalid-value' });
    return undefined;
  }

  const raw = rawValues[0];
  const folded = raw.toLowerCase();
  if ((TAB_SCOPE_VALUES as readonly string[]).includes(folded)) {
    return folded as TabScope;
  }

  dropped.push({ param: 'tab', value: raw, reason: 'invalid-value' });
  return undefined;
}

// ---------------------------------------------------------------------------
// parse
// ---------------------------------------------------------------------------

/**
 * `URL → filter state`, the only direction this module currently
 * implements (T-02; `serialize` is T-03).
 *
 * No DI, no router, no signals, no logging, no toast — everything this
 * function rejects is returned in `dropped` and everything it recognized
 * (valid or not) is reflected in `hadRecognizedParam`. The caller owns
 * precedence against session state and owns telling the user anything
 * (design §6.1).
 *
 * **Legacy resolution is by key presence, never by parameter order or
 * value validity** (R-RCU-006 AC.2): a legacy parameter's raw values are
 * only even looked at when its canonical counterpart contributed zero raw
 * values. If the canonical key is present at all — even carrying an
 * invalid value — the legacy fallback is never consulted, so
 * `?indicatorTab=1&indicator=policy-change` always resolves to
 * `policy-change`, deterministically, in either order the two params
 * appear in the URL.
 *
 * **`statusLabel`'s value never reaches `filters`** (R-RCU-006 AC.3,
 * hand-off hazard from the T-01 Reviewer): `LEGACY_PARAM_TO_CANONICAL` maps
 * both `statustab` and `statuslabel` onto the same `status` slot, but this
 * function only ever reads the raw values for the *`statustab`* group when
 * resolving the legacy status fallback — the `statuslabel` group's values
 * are never fetched for filter purposes at all. `statuslabel`'s only effect
 * here is on `hadRecognizedParam` (via `RECOGNIZED_PARAM_NAMES` membership),
 * which cares about presence, not content. The display label is resolved
 * later, client-side, from the status control list (requirements.md
 * R-RCU-006).
 */
export function parse(paramMap: ParamMap): ParsedResultsCenterUrl {
  const groups = groupKeysByFoldedName(paramMap);
  const dropped: DroppedUrlToken[] = [];

  const hadRecognizedParam = Array.from(groups.keys()).some((folded) =>
    RECOGNIZED_PARAM_NAMES.has(folded),
  );

  // indicator — canonical, else legacy indicatorTab (never both; presence-based).
  const indicatorRaw = rawValuesFor(paramMap, groups, 'indicator');
  const indicator =
    indicatorRaw.length > 0
      ? resolveIndicatorValue(indicatorRaw, dropped)
      : resolveLegacyIndicatorTab(rawValuesFor(paramMap, groups, 'indicatortab'), dropped);

  // status — canonical, else legacy statusTab. statusLabel is never consulted
  // for its value (see the doc comment above) — only statustab feeds the
  // legacy fallback.
  const statusRaw = rawValuesFor(paramMap, groups, 'status');
  const statusTokens = splitMultiValue(statusRaw);
  const status =
    statusTokens.length > 0
      ? resolveMultiValueParam('status', statusTokens, dropped, resolveStatusToken)
      : resolveLegacyStatusTab(rawValuesFor(paramMap, groups, 'statustab'), dropped);

  const contractTokens = splitMultiValue(rawValuesFor(paramMap, groups, 'contract'));
  const contract = resolveMultiValueParam('contract', contractTokens, dropped, resolveContractToken);

  const yearTokens = splitMultiValue(rawValuesFor(paramMap, groups, 'year'));
  const year = resolveMultiValueParam('year', yearTokens, dropped, resolveYearToken);

  const sourceTokens = splitMultiValue(rawValuesFor(paramMap, groups, 'source'));
  const source = resolveMultiValueParam('source', sourceTokens, dropped, resolveSourceToken);

  const scope = resolveScope(rawValuesFor(paramMap, groups, 'tab'), dropped);

  const filters: ResultsCenterUrlFilters = {
    ...(indicator !== undefined ? { indicator } : {}),
    ...(contract !== undefined ? { contract } : {}),
    ...(status !== undefined ? { status } : {}),
    ...(year !== undefined ? { year } : {}),
    ...(source !== undefined ? { source } : {}),
  };

  return { filters, scope, dropped, hadRecognizedParam };
}

// ---------------------------------------------------------------------------
// serialize (T-03) — the inverse direction, `state → URL params`
// ---------------------------------------------------------------------------

/**
 * The three legacy parameter names in their **original camelCase spelling**
 * — exactly how they appear in an already-delivered CapDev email and
 * therefore exactly how they appear as keys on `currentParams` at merge
 * time (`ActivatedRoute.snapshot.queryParams` reflects the URL's own
 * casing, it does not fold it).
 *
 * `results-center-url.vocabulary.ts`'s `LEGACY_PARAM_NAMES` is the wrong
 * shape for this: it is folded lower-case (`indicatortab`) for `parse`'s
 * input-side lookup (R3-3). Nulling `indicatortab` would not clear
 * `?indicatorTab=1` — `queryParamsHandling: 'merge'` matches keys by exact
 * case, not folded — so this is a deliberately separate, local list for the
 * output side, not a duplicate of the vocabulary's.
 */
const LEGACY_PARAM_NAMES_ORIGINAL_CASE = ['indicatorTab', 'statusTab', 'statusLabel'] as const;

/**
 * `state → params`, the inverse of {@link parse}.
 *
 * The result is consumed by a `queryParamsHandling: 'merge'` navigation
 * (design §6.2 step 5): `{...currentParams, ...next}`, with only
 * **null-valued** keys stripped from the merged result — a key this
 * function simply omits is preserved **verbatim**. That is why every
 * parameter this codec *parses* — the six canonical ones (R-RCU-001) *and*
 * the three legacy ones (R-RCU-006) — is always present below, as either its
 * active string value or an explicit `null`, never left out (R3-2, R3-4;
 * design §6.2 "Why step 3 emits nulls" / "The null set is 'every key the
 * codec parses'").
 *
 * A key this codec does **not** parse (`utm_source`, anything unrecognized)
 * never appears in the returned object at all — that omission, not a null,
 * is what keeps it alive under merge (R-RCU-004 AC.3). This function never
 * needs to know the current URL to get that right: it only ever emits keys
 * it owns.
 *
 * **Never serializes a user identifier** (NFR-RCU-003): the my/all scope is
 * expressed purely as `tab: 'my' | null`, resolved client-side from the
 * session cache by the caller — no `sec_user_id` or other identifier is an
 * input to this function at all.
 */
export function serialize(state: ResultsCenterUrlState): Record<string, string | null> {
  const { filters, scope } = state;

  const indicatorSlug =
    filters.indicator !== undefined ? INDICATOR_ID_TO_SLUG.get(filters.indicator) : undefined;

  const statusSlugs = (filters.status ?? [])
    .map((id) => STATUS_ID_TO_SLUG.get(id))
    .filter((slug): slug is string => slug !== undefined);

  const sourceSlugs = (filters.source ?? [])
    .map((code) => PLATFORM_CODE_TO_SOURCE_SLUG.get(code))
    .filter((slug): slug is string => slug !== undefined);

  const params: Record<string, string | null> = {
    indicator: indicatorSlug ?? null,
    contract:
      filters.contract && filters.contract.length > 0
        ? filters.contract.map((code) => code.toUpperCase()).join(',')
        : null,
    status: statusSlugs.length > 0 ? statusSlugs.join(',') : null,
    year: filters.year && filters.year.length > 0 ? filters.year.join(',') : null,
    source: sourceSlugs.length > 0 ? sourceSlugs.join(',') : null,
    // R3-4 — `tab` always resolves to `my` or `all` (design §6.1 step 3), so
    // a literal "emit when active" reading would always emit it. Only `my`
    // is ever written; `all` (and an unresolved scope) serialize to `null`,
    // or clearing filters while scoped to `all` would leave `/results-center
    // ?tab=all` glued to a URL R-RCU-003 requires to read with no query
    // string at all (design §6.2 "Why `tab` needs its own rule").
    tab: scope === 'my' ? 'my' : null,
  };

  // R3-2 — every legacy key the codec *parses* is nulled here too, in the
  // original camelCase spelling currentParams actually carries. The codec
  // parses these keys (R-RCU-006), so it owns clearing them; without this,
  // arriving from a delivered email at `?indicatorTab=1` and switching away
  // from it would leave `indicatorTab=1` in the address bar forever, and a
  // reload would resurrect it.
  for (const legacyName of LEGACY_PARAM_NAMES_ORIGINAL_CASE) {
    params[legacyName] = null;
  }

  return params;
}
