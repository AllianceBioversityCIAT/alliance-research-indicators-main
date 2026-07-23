import { tableSortPathToApiSortField } from './result-table-sort.util';

describe('tableSortPathToApiSortField', () => {
  it('maps known table column paths to API sort fields', () => {
    expect(tableSortPathToApiSortField('result_official_code')).toBe('code');
    expect(tableSortPathToApiSortField('title')).toBe('result-title');
    expect(tableSortPathToApiSortField('created_at')).toBe('creation-date');
  });

  it('defaults unknown paths to code', () => {
    expect(tableSortPathToApiSortField('unknown-field')).toBe('code');
  });
});
