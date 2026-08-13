import { GetYear } from '@shared/interfaces/get-year.interface';
import { PlatformSourceFilter } from '@shared/interfaces/platform-source-filter.interface';

export class TableFilters {
  levers: { id: number; name?: string; short_name?: string }[] = [];
  // `name` is optional: `seedFromUrl()` (D-URL-10) seeds only the option-value
  // key (`{ result_status_id }`) so `MultiselectComponent`'s label backfill
  // still runs; `name` arrives once the control list resolves it.
  statusCodes: { result_status_id: number; name?: string }[] = [];
  // Same D-URL-10 reasoning: `seedFromUrl()` seeds `{ report_year }` only —
  // the rest of `GetYear` is backfilled once the control list resolves.
  years: ({ report_year: number } & Partial<GetYear>)[] = [];
  contracts: { agreement_id: string; display_label?: string }[] = [];
  indicators: { indicator_id: number; name: string }[] = [];
  // Same D-URL-10 reasoning: `seedFromUrl()` seeds `{ platform_code }` only.
  sources: ({ platform_code: string } & Partial<PlatformSourceFilter>)[] = [];
}
