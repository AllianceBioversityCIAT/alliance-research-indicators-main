import { SOURCE_FILTER_OPTIONS } from '@shared/constants/source-filter-options.constants';

/**
 * results-center-url.vocabulary.ts
 *
 * Single source of truth for every token the Results Center URL layer
 * (`results-center-url.codec.ts`, not part of this file) understands: the
 * `indicator`, `status` and `source` slug vocabularies, the `tab` scope
 * vocabulary, the recognized query-parameter name list (canonical +
 * permanently-supported legacy), and the input bounds the codec enforces.
 *
 * Frozen by design (docs/specs/results-center/url-filters/design.md §5,
 * decision D-URL-2): every slug below is a literal string, never derived at
 * runtime from a display name. An id with no slug here degrades via
 * R-RCU-005 rather than rotting every delivered link the moment someone
 * renames a display label.
 *
 * `lever` is deliberately absent from every list below (D-URL-6) — the
 * Results Center sidebar renders no lever control, so a URL parameter for
 * it would be a filter with no way to set it. Do not add one here.
 */

/** Inverts a 1:1 map. Duplicate values in `map` would silently collapse the
 * result — the vocabulary spec asserts against this by checking sizes match. */
function invert<K, V>(map: ReadonlyMap<K, V>): ReadonlyMap<V, K> {
  return new Map(Array.from(map, ([key, value]) => [value, key] as const));
}

// ---------------------------------------------------------------------------
// indicator — single-value (R-RCU-001, design §5.1)
// ---------------------------------------------------------------------------

/**
 * Byte-identical to the server's `QueryIndicatorsEnum`
 * (server/researchindicators/src/domain/entities/indicators/enum/indicators.enum.ts:25-32).
 * NOT imported from the server package — the two packages are separate
 * deployables with no shared package (design §8) — so parity is asserted
 * against a literal string in this module's spec, not a shared type.
 *
 * The slug is not a kebab-case of the display name for ids 2 and 5
 * (`Innovation Development` → `innovation-dev`, `OICR` → `oicr` not
 * `o-i-c-r`) — the server's spelling is the contract, not a derivation.
 *
 * `cap_sharing` (`star-pdf-report.util.ts:26`) is a PDF-report key and is
 * deliberately absent — it MUST NOT leak into the URL (R-RCU-001 AC.5).
 */
export const INDICATOR_SLUG_TO_ID: ReadonlyMap<string, number> = new Map([
  ['capacity-sharing-for-development', 1],
  ['innovation-dev', 2],
  ['knowledge-product', 3],
  ['policy-change', 4],
  ['oicr', 5],
  ['innovation-use', 6],
]);

export const INDICATOR_ID_TO_SLUG: ReadonlyMap<number, string> = invert(INDICATOR_SLUG_TO_ID);

// ---------------------------------------------------------------------------
// status — multi-value (design §5.2)
// ---------------------------------------------------------------------------

/**
 * Authored from the `allResultStatus` control list the filter actually
 * offers (25 rows, dev database, 2026-08-12). The map IS the contract — the
 * mechanical kebab-casing used to seed it once is not re-run at runtime.
 *
 * Known divergence, out of scope (requirements.md §9 R5): the server's own
 * `ResultStatusNameEnum` carries only 22 ids (15, 21, 22 absent) and eight
 * differing display names. These slugs are frozen strings immune to either
 * source, so the divergence cannot change them; an id the control list does
 * not return simply never resolves, degrading via R-RCU-005.
 */
export const STATUS_SLUG_TO_ID: ReadonlyMap<string, number> = new Map([
  ['editing', 1],
  ['submitted', 2],
  ['accepted', 3],
  ['draft', 4],
  ['pending-revision', 5],
  ['approved', 6],
  ['not-approved', 7],
  ['deleted', 8],
  ['oicr-requested', 9],
  ['oicr-accepted', 10],
  ['oicr-postponed', 11],
  ['oicr-in-science-edition', 12],
  ['oicr-in-km-curation', 13],
  ['oicr-published', 14],
  ['oicr-not-accepted', 15],
  ['editing-in-prms', 16],
  ['submitted-in-prms', 17],
  ['qaed-in-prms', 18],
  ['discontinued-in-prms', 19],
  ['completed-in-tip', 20],
  ['editing-in-aiccra', 21],
  ['submitted-in-aiccra', 22],
  ['bilateral-pending-review', 23],
  ['bilateral-approved', 24],
  ['bilateral-rejected', 25],
]);

export const STATUS_ID_TO_SLUG: ReadonlyMap<number, string> = invert(STATUS_SLUG_TO_ID);

// ---------------------------------------------------------------------------
// source — frozen, synchronous, multi-value (design §5.3, D-URL-13)
// ---------------------------------------------------------------------------

/**
 * `SOURCE_FILTER_OPTIONS` is a static, synchronous, four-entry client
 * constant (`source-filter-options.constants.ts`) — not a remote/async
 * control list, so there is nothing to await here. The slug is a
 * deterministic lower-case of `platform_code`: unlike `status`/`indicator`,
 * `platform_code` is a stable technical code, not an editorial display
 * label, so this transform can never rot the way a kebab-of-a-display-name
 * would.
 */
export const SOURCE_SLUG_TO_PLATFORM_CODE: ReadonlyMap<string, string> = new Map(
  SOURCE_FILTER_OPTIONS.map(
    (option) => [option.platform_code.toLowerCase(), option.platform_code] as const,
  ),
);

export const PLATFORM_CODE_TO_SOURCE_SLUG: ReadonlyMap<string, string> = invert(
  SOURCE_SLUG_TO_PLATFORM_CODE,
);

// ---------------------------------------------------------------------------
// tab — my/all scope (design §5.4)
// ---------------------------------------------------------------------------

export const TAB_SCOPE_VALUES = ['my', 'all'] as const;

export type TabScope = (typeof TAB_SCOPE_VALUES)[number];

// ---------------------------------------------------------------------------
// recognized parameter names — folded (R3-3, design §6.1 step 1)
// ---------------------------------------------------------------------------

/**
 * The seven canonical parameters (R-RCU-001). Stored already lower-case.
 *
 * **`indicator` and `indicators` are two different filters, not a typo pair**
 * (D-URL-18). The Results Center exposes the indicator dimension through two
 * distinct controls writing two distinct wire keys:
 *
 * | Control | Wire key | Parameter | Cardinality |
 * | --- | --- | --- | --- |
 * | Tab strip | `indicator-codes-tabs` | `indicator` | exactly one |
 * | Sidebar multiselect | `indicator-codes-filter` | `indicators` | many |
 *
 * They are **mutually exclusive in the UI**: the multiselect is `@if`-gated on
 * `!resultsFilter()['indicator-codes-tabs']?.length`
 * (`table-filters-sidebar.component.html:2`), so a set tab hides it. That
 * exclusivity is what makes two parameters safe rather than merely redundant —
 * only one can be active at a time, and on collision `indicator` wins, because
 * the tab is what the user would actually be looking at.
 *
 * `indicator` stays single-value and unchanged: it is the parameter every
 * already-delivered CapDev email carries, and D-URL-12's reasoning (a comma is
 * unrepresentable in a one-id tab strip) still holds for it.
 */
export const CANONICAL_PARAM_NAMES = [
  'indicator',
  'indicators',
  'contract',
  'status',
  'year',
  'source',
  'tab',
] as const;

export type CanonicalParamName = (typeof CANONICAL_PARAM_NAMES)[number];

/**
 * The three permanently-supported legacy parameters (R-RCU-006), stored
 * **lower-case-folded** — never in their original camelCase spelling
 * (`indicatorTab`, `statusTab`, `statusLabel`).
 *
 * R3-3 — this is the one line in the feature that must never regress.
 * `parse()` folds every incoming key to lower case before lookup (design
 * §6.1 step 1). If this list were stored raw/camelCase instead, a folded
 * incoming key (`"indicatortab"`) would never match a raw stored key
 * (`"indicatorTab"`), and every already-delivered CapDev email would
 * silently stop filtering — with no error anywhere in the stack.
 */
export const LEGACY_PARAM_NAMES = ['indicatortab', 'statustab', 'statuslabel'] as const;

/**
 * Legacy → canonical mapping, used to resolve precedence deterministically
 * (R-RCU-006 AC.2): a legacy parameter is consulted only when its canonical
 * counterpart is absent. `statuslabel`'s *value* is accepted but ignored
 * (R-RCU-006 AC.3) — it still maps to `status` here so a caller knows which
 * canonical slot it would otherwise occupy.
 */
export const LEGACY_PARAM_TO_CANONICAL: ReadonlyMap<string, CanonicalParamName> = new Map([
  ['indicatortab', 'indicator'],
  ['statustab', 'status'],
  ['statuslabel', 'status'],
]);

export const RECOGNIZED_PARAM_NAMES: ReadonlySet<string> = new Set([
  ...CANONICAL_PARAM_NAMES,
  ...LEGACY_PARAM_NAMES,
]);

/** The single normalization every recognized-key comparison uses. */
export function foldParamName(name: string): string {
  return name.toLowerCase();
}

/**
 * Folds `name` and checks it against the recognized-parameter list. Both
 * canonical and legacy names return `true`, and both are stored/compared
 * folded (R3-3), so a mixed-case incoming key such as `indicatorTab` (as it
 * appears in every already-delivered CapDev email) still resolves.
 */
export function isRecognizedParamName(name: string): boolean {
  return RECOGNIZED_PARAM_NAMES.has(foldParamName(name));
}

// ---------------------------------------------------------------------------
// bounds (R-RCU-005 AC.4, design §5.5)
// ---------------------------------------------------------------------------

/** A list parameter carrying more than this many values is dropped whole. */
export const MAX_LIST_PARAM_VALUES = 50;

/** A single token longer than this many characters is dropped. */
export const MAX_PARAM_TOKEN_LENGTH = 64;
