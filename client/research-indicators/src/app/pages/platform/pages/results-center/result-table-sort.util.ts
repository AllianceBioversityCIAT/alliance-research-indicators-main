const PATH_TO_API_SORT_FIELD: Record<string, string> = {
  result_official_code: 'code',
  title: 'result-title',
  'indicators.name': 'indicator',
  'result_status.name': 'status',
  'result_contracts.contract_id': 'project-code',
  primaryLeverSort: 'primary-lever',
  report_year_id: 'live-version',
  snapshot_years: 'snapshot-version',
  'created_by_user.first_name': 'creator',
  created_at: 'creation-date'
};

export function tableSortPathToApiSortField(path: string): string {
  return PATH_TO_API_SORT_FIELD[path] ?? 'code';
}
