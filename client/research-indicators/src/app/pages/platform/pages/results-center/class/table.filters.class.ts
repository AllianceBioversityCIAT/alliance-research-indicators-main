import { GetYear } from '@shared/interfaces/get-year.interface';
import { PlatformSourceFilter } from '@shared/interfaces/platform-source-filter.interface';

export class TableFilters {
  levers: { id: number; name?: string; short_name?: string }[] = [];
  statusCodes: { result_status_id: number; name: string }[] = [];
  years: GetYear[] = [];
  contracts: { agreement_id: string; display_label?: string }[] = [];
  indicators: { indicator_id: number; name: string }[] = [];
  sources: PlatformSourceFilter[] = [];
}
