import { StatusConfig } from '../result-config.interface';
import { Result } from './result.interface';

export function normalizeSnapshotYears(value: unknown): number[] {
  if (Array.isArray(value)) {
    return value.map(y => (typeof y === 'string' ? Number.parseInt(y.trim(), 10) : Number(y))).filter(n => Number.isFinite(n));
  }
  if (typeof value === 'string' && value.trim() !== '') {
    return value
      .split(',')
      .map(s => Number.parseInt(s.trim(), 10))
      .filter(n => Number.isFinite(n));
  }
  return [];
}

export interface V2ResultListItem {
  created_at?: string;
  updated_at?: string;
  created_by?: number;
  updated_by?: number;
  is_active?: number | boolean;
  result_id?: number;
  result_official_code?: number | string;
  platform_code?: string;
  report_year_id?: number;
  title?: string;
  indicator_id?: number;
  indicator_name?: string;
  status_id?: number;
  status_name?: string;
  status_config?: StatusConfig;
  status_description?: string;
  snapshot_years?: number[] | string | null;
  contract_id?: string | null;
  contract_description?: string | null;
  lever_name?: string | null;
  create_user_id?: number;
  create_user_first_name?: string;
  create_user_last_name?: string;
  external_link?: string;
  public_link?: string;
}

export function mapV2ResultListItemToResult(row: V2ResultListItem): Result {
  const normalizedSnapshots = normalizeSnapshotYears(row.snapshot_years);

  const hasCreator =
    (row.create_user_first_name != null && String(row.create_user_first_name).trim() !== '') ||
    (row.create_user_last_name != null && String(row.create_user_last_name).trim() !== '');

  return {
    is_active: row.is_active === true || row.is_active === 1,
    result_id: row.result_id ?? 0,
    result_platform: row.platform_code ?? '',
    result_official_code: String(row.result_official_code ?? ''),
    version_id: null,
    title: row.title ?? '',
    platform_code: row.platform_code ?? '',
    external_link: row.external_link,
    public_link: row.public_link,
    description: null,
    indicator_id: row.indicator_id ?? 0,
    geo_scope_id: null,
    indicators: row.indicator_name ? { name: row.indicator_name, icon_src: '' } : undefined,
    result_status:
      row.status_id != null
        ? {
            result_status_id: row.status_id,
            name: row.status_name,
            description: row.status_description,
            config: row.status_config
          }
        : undefined,
    contract_id: row.contract_id ?? undefined,
    contract_description: row.contract_description ?? undefined,
    result_contracts: row.contract_id ? { contract_id: row.contract_id, is_primary: 1 } : undefined,
    report_year_id: row.report_year_id,
    created_by_user: hasCreator
      ? {
          first_name: (row.create_user_first_name ?? '').trim(),
          last_name: (row.create_user_last_name ?? '').trim()
        }
      : undefined,
    created_at: row.created_at,
    updated_at: row.updated_at,
    snapshot_years: normalizedSnapshots,
    ...(row.lever_name ? { result_levers: [{ is_primary: 1, lever: { short_name: row.lever_name } }] as unknown as Result['result_levers'] } : {})
  } as Result;
}
