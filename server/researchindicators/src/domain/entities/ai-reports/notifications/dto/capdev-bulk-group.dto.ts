/**
 * Row/DTO shapes for the four CapDev bulk-upload notification repository
 * queries (Q1 groups+people+token owner, Q2 metrics, Q3 countries, Q4
 * unattributed results) and the two writes.
 *
 * Field names on the mapped DTOs mirror the underlying column names
 * (snake_case) so the values can be handed to Handlebars templates and to
 * `capdev-recipients.builder.ts` / `capdev-metrics.formatter.ts` (T-06/T-07)
 * without a second renaming pass.
 */

/** One `alliance_user_staff` person (PI / RA / PA), or `null` when unresolvable. */
export class CapdevBulkStaffPersonDto {
  carnet: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
}

/** The bulk process' `created_by` resolved against `sec_users` — the token owner. */
export class CapdevBulkTokenOwnerDto {
  sec_user_id: number;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
}

/**
 * Raw shape of one row returned by Q1's `getRawMany()`. In production this
 * arrives already collapsed to one row per `agreement_id` (the query's
 * `GROUP BY`); the raw-row shape is still per-candidate-row so the exported
 * mapper below can defensively re-collapse and prove the collapsing rule
 * with fixtures, independent of a live database (see repository spec).
 */
export interface CapdevBulkGroupRawRow {
  agreement_id: string;
  project_lead_description: string | null;
  pi_carnet: string | null;
  pi_first_name: string | null;
  pi_last_name: string | null;
  pi_email: string | null;
  ra_carnet: string | null;
  ra_first_name: string | null;
  ra_last_name: string | null;
  ra_email: string | null;
  pa_carnet: string | null;
  pa_first_name: string | null;
  pa_last_name: string | null;
  pa_email: string | null;
  token_owner_id: string | number | null;
  token_owner_first_name: string | null;
  token_owner_last_name: string | null;
  token_owner_email: string | null;
  /** Comma-separated `result_id`s that had >1 active primary contract, or null/empty. */
  multi_primary_result_ids: string | null;
}

/** One project group: the recipients + salutation inputs the builder needs. */
export class CapdevBulkGroupDto {
  agreement_id: string;
  project_lead_description: string | null;
  pi: CapdevBulkStaffPersonDto | null;
  ra: CapdevBulkStaffPersonDto | null;
  pa: CapdevBulkStaffPersonDto | null;
  token_owner: CapdevBulkTokenOwnerDto | null;
}

/** One multi-primary-contract tie-break event, for the §10 warn log. */
export interface CapdevMultiPrimaryWarningDto {
  result_id: number;
  agreement_id: string;
}

/** Return shape of the Q1 raw-row → group-DTO mapper. */
export interface CapdevBulkGroupsMapResult {
  groups: CapdevBulkGroupDto[];
  multiPrimaryWarnings: CapdevMultiPrimaryWarningDto[];
}

/** Raw shape of one row returned by Q2's `getRawMany()` — one per `agreement_id`. */
export interface CapdevBulkMetricsRawRow {
  agreement_id: string;
  trainings_count: string | number;
  participants_total: string | number | null;
  female_participants_total: string | number | null;
  start_date: Date | string | null;
  end_date: Date | string | null;
}

/** Q2 metrics, numerically coerced, for one group. */
export class CapdevBulkMetricsDto {
  agreement_id: string;
  trainings_count: number;
  participants_total: number;
  female_participants_total: number;
  start_date: Date | null;
  end_date: Date | null;
}

/** Raw shape of one row returned by Q3's `getRawMany()` — one per `agreement_id`. */
export interface CapdevBulkCountriesRawRow {
  agreement_id: string;
  /** `GROUP_CONCAT(DISTINCT clarisa_countries.name ORDER BY name)` — email body copy. */
  country_names: string | null;
  /** `GROUP_CONCAT(DISTINCT result_countries.isoAlpha2)` — the `countries` JSON column. */
  iso_alpha2_list: string | null;
}

/** Q3 countries, split into arrays, for one group. */
export class CapdevBulkCountriesDto {
  agreement_id: string;
  country_names: string[];
  iso_alpha2_list: string[];
}

/** Input to `persistProcessMetrics` — the batch-level aggregate columns of §4.1. */
export interface CapdevBulkProcessMetricsInput {
  total_results?: number | null;
  total_capdev_results?: number | null;
  total_participants?: number | null;
  total_female_participants?: number | null;
  activity_start_date?: Date | null;
  activity_end_date?: Date | null;
  countries?: string[] | null;
}
