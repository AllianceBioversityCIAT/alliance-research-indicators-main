/**
 * The full set of Handlebars variables the CapDev bulk-upload summary
 * template (`capdev-bulk-summary.html`, T-04) interpolates. Every field is a
 * **pre-rendered string** — never a number, `Date`, or array — because
 * Handlebars fails *silently* on those (a null renders as an empty string,
 * a missing helper renders nothing), which is exactly the failure mode that
 * would put `NaN` or a dangling "from to" in front of a Project Leader
 * (design.md DD-4).
 *
 * ⚠️ **Binding empty-string contract.** `{{#if}}` in Handlebars cannot tell
 * `"0"` apart from a real value — a **non-empty string is always truthy**,
 * even the string `"0"`. So the sentinel for "this clause must not render"
 * is the **empty string**, never `"0"`, never `null`, never `undefined`.
 * This applies to every guarded field below (`countries`, `startDate`,
 * `endDate`, `participantsCount`, `percentageWomen`): when the guard should
 * fail, the producer (`capdev-metrics.formatter.ts`, T-07) must emit `""`,
 * not a stringified zero.
 *
 * `trainingsCount`, `starLink`, `tokenOwnerName`, `tokenOwnerEmail` are
 * unguarded in the template — they render unconditionally by contract and
 * must never be empty.
 */
export class CapdevBulkEmailTemplateDto {
  /** Salutation subject — T-06's recipient chain. Non-empty by contract. */
  projectLeadName: string;

  /** e.g. `"12"`. Unguarded — a group is only dispatched when this is > 0. */
  trainingsCount: string;

  /**
   * Comma-joined, deduplicated, alphabetically ordered CLARISA country
   * names, or the literal `"multiple countries"` when the group has no
   * resolved country. Guarded by `{{#if countries}}` — never empty.
   */
  countries: string;

  /**
   * e.g. `"March 2025"`. Guarded by `{{#if startDate}}`, which **also**
   * guards `endDate` in the template. Must be `""` whenever `endDate` is
   * `""`, and vice versa — a half-range (one populated, one empty) renders
   * a dangling connector ("from March 2025 to.") that the template cannot
   * defend against itself.
   */
  startDate: string;

  /** Range end, e.g. `"June 2025"`. Renders only inside the `startDate` guard — see `startDate`'s both-or-neither rule. */
  endDate: string;

  /**
   * e.g. `"1,204"` (`en-US` thousands separator). Guarded by
   * `{{#if participantsCount}}`, which also guards `percentageWomen`.
   * Empty when the group's total participants is `0` or all-null.
   */
  participantsCount: string;

  /**
   * The women percentage **without** the `%` sign, e.g. `"58"`. Nested
   * inside the `participantsCount` guard — never rendered when
   * `participantsCount` is empty. Also empty whenever the computed
   * percentage rounds to `0` (participants > 0 but zero women recorded),
   * since a rendered `"0"` clause here would truthily render "— 0% of whom
   * were women" per the binding contract above.
   */
  percentageWomen: string;

  /** Full STAR CapDev panel URL. Unguarded, non-empty by contract. */
  starLink: string;

  /** Token owner's display name for the contact sentence (AC.4). Unguarded, non-empty by contract. */
  tokenOwnerName: string;

  /** Token owner's email for the contact sentence (AC.4). Unguarded, non-empty by contract. */
  tokenOwnerEmail: string;
}

/**
 * The subset of {@link CapdevBulkEmailTemplateDto} that
 * `capdev-metrics.formatter.ts` (T-07) owns and produces. The remaining
 * fields (`projectLeadName`, `starLink`, `tokenOwnerName`,
 * `tokenOwnerEmail`) are supplied by T-06 and T-08, which spread this
 * result together with theirs into the full template DTO before rendering.
 */
export type CapdevMetricsTemplateFields = Pick<
  CapdevBulkEmailTemplateDto,
  | 'trainingsCount'
  | 'countries'
  | 'startDate'
  | 'endDate'
  | 'participantsCount'
  | 'percentageWomen'
>;
