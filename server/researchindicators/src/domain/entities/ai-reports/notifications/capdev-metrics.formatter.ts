import { CapdevMetricsTemplateFields } from './dto/capdev-bulk-email-template.dto';
import { CapdevBulkMetricsDto } from './dto/capdev-bulk-group.dto';

const THOUSANDS_LOCALE = 'en-US';

/** `{{#if}}`-safe: a positive finite number, otherwise `null` (never `0`, `NaN`, `Infinity`, or negative). */
function toPositiveFinite(value: number): number | null {
  return Number.isFinite(value) && value > 0 ? value : null;
}

/** `en-US` thousands-separated count. Non-finite input renders `"0"`, never a `NaN`/`Infinity` string. */
function formatCount(value: number): string {
  const safe = Number.isFinite(value) ? value : 0;
  return safe.toLocaleString(THOUSANDS_LOCALE);
}

const MONTH_YEAR_FORMATTER = new Intl.DateTimeFormat('en-US', {
  month: 'long',
  year: 'numeric',
  timeZone: 'UTC', // deterministic across server locales; the DB value is a calendar date, not an instant.
});

/** `"Month YYYY"`, or `null` for anything that is not a valid `Date` (missing bound, `Invalid Date`). */
function formatMonthYear(value: Date | null | undefined): string | null {
  if (!(value instanceof Date) || Number.isNaN(value.getTime())) return null;
  return MONTH_YEAR_FORMATTER.format(value);
}

/**
 * Both-or-neither (Advisory 2 / DD-4): the template guards `endDate` only
 * with `{{#if startDate}}`, so it cannot defend itself against a
 * half-range. If either bound fails to format, **both** render empty —
 * never a dangling "from March 2025 to.".
 */
function formatDateRange(
  startDate: Date | null | undefined,
  endDate: Date | null | undefined,
): { startDate: string; endDate: string } {
  const start = formatMonthYear(startDate);
  const end = formatMonthYear(endDate);
  if (start === null || end === null) {
    return { startDate: '', endDate: '' };
  }
  return { startDate: start, endDate: end };
}

/**
 * Participants + women %, together (Advisory 1 / DD-4, amended OD-2
 * 2026-08-09). The empty string is the *only* "do not render" sentinel —
 * Handlebars' `{{#if}}` treats the string `"0"` as truthy, so participants
 * of `0` collapses to `""`, never `"0"`.
 *
 * The women-percentage branch is the four-state rule from R-CBU-006 /
 * design.md §6.5, computed on the **un-rounded** share `p`:
 *   - participants `0`/all-null → `""` (handled by the early return above)
 *   - `p <= 0` (no women recorded) → `""` — clause omitted
 *   - `0 < p < 1` → `"<1%"` — the floor clause: a non-zero sub-1% share is
 *     reported, never silently dropped as though no women attended
 *   - `p >= 1` → `"{round(p)}%"`
 *
 * The boundary is the exact comparison `p < 1`, **not** `Math.round(p) === 0`
 * — those differ on `[0.5, 1)`, where rounding would print `"1%"` and
 * over-report in the opposite direction (D-OD2-a). Do not "simplify" this
 * back to a round.
 *
 * The `!(percentage > 0)` guard (rather than e.g. `Number.isNaN(...)`)
 * mirrors the prior implementation's base check on purpose: `NaN > 0` is
 * `false`, so a non-finite `percentage` is absorbed into the suppressed
 * branch for free, and `participantsCount` can never be the string `"0"`
 * because `participants` is already guaranteed positive-finite above.
 *
 * The `%` sign is emitted **here**, in the formatter's output string — not
 * by the template — so one Handlebars slot can carry both `"<1%"` and
 * `"58%"` without branching on magnitude (D-OD2-b).
 */
function formatParticipants(
  participantsTotal: number,
  femaleParticipantsTotal: number,
): { participantsCount: string; percentageWomen: string } {
  const participants = toPositiveFinite(participantsTotal);
  if (participants === null) {
    return { participantsCount: '', percentageWomen: '' };
  }

  const female = toPositiveFinite(femaleParticipantsTotal) ?? 0;
  const percentage = (female / participants) * 100;

  let percentageWomen: string;
  if (!(percentage > 0)) {
    percentageWomen = '';
  } else if (percentage < 1) {
    percentageWomen = '<1%';
  } else {
    percentageWomen = `${Math.round(percentage)}%`;
  }

  return {
    participantsCount: participants.toLocaleString(THOUSANDS_LOCALE),
    percentageWomen,
  };
}

/**
 * Deduplicated, alphabetically ordered, comma-joined CLARISA country names,
 * or the literal `"multiple countries"` when the resolved set is empty
 * (R-CBU-006 AC.2). Defensive against blank entries and an unsorted/
 * duplicated input, independent of whatever ordering the repository's
 * `GROUP_CONCAT(DISTINCT ... ORDER BY name)` already applied.
 */
function formatCountries(countryNames: string[] | null | undefined): string {
  const names = (countryNames ?? []).filter(
    (name): name is string =>
      typeof name === 'string' && name.trim().length > 0,
  );
  if (names.length === 0) return 'multiple countries';

  const unique = Array.from(new Set(names));
  unique.sort((a, b) => a.localeCompare(b, 'en-US'));
  return unique.join(', ');
}

/**
 * Pure formatter (design.md §6.5, DD-4; R-CBU-006). Takes T-05's raw
 * per-group aggregate (`CapdevBulkMetricsDto`, from `findMetrics`) and the
 * CLARISA country-name list for that same group (`findCountries`'s
 * `CapdevBulkCountriesDto.country_names`, or `[]`/`null` when the group has
 * no resolved country) and returns the pre-rendered string fields of the
 * Handlebars contract. Every degenerate case is resolved here — never in
 * Handlebars, which fails silently (a null renders as an empty string, a
 * missing helper renders nothing) and would put `NaN` or a dangling
 * "from to" in front of a Project Leader.
 */
export function formatCapdevMetrics(
  metrics: CapdevBulkMetricsDto,
  countryNames: string[] | null | undefined,
): CapdevMetricsTemplateFields {
  const { startDate, endDate } = formatDateRange(
    metrics.start_date,
    metrics.end_date,
  );
  const { participantsCount, percentageWomen } = formatParticipants(
    metrics.participants_total,
    metrics.female_participants_total,
  );

  return {
    trainingsCount: formatCount(metrics.trainings_count),
    countries: formatCountries(countryNames),
    startDate,
    endDate,
    participantsCount,
    percentageWomen,
  };
}
