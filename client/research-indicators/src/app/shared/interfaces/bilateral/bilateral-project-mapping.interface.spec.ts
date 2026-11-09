import { formatClarisaProjectLabel } from './bilateral-project-mapping.interface';

describe('formatClarisaProjectLabel', () => {
  it('joins distinct short and full names', () => {
    expect(formatClarisaProjectLabel({ short_name: 'ACIAR', full_name: 'Australian Centre' })).toBe('ACIAR — Australian Centre');
  });

  it('prefers the automapper camelCase fields over the picker fields', () => {
    expect(
      formatClarisaProjectLabel({
        clarisaProjectShortName: 'A',
        clarisaProjectFullName: 'Alpha',
        short_name: 'ignored',
        full_name: 'ignored too'
      })
    ).toBe('A — Alpha');
  });

  it('collapses to one name when short and full names match case-insensitively', () => {
    expect(formatClarisaProjectLabel({ short_name: 'Rice', full_name: 'RICE' })).toBe('Rice');
  });

  it('returns only the short name when the full name is missing or blank', () => {
    expect(formatClarisaProjectLabel({ short_name: ' S ', full_name: '  ' })).toBe('S');
    expect(formatClarisaProjectLabel({ short_name: 'S', full_name: null })).toBe('S');
  });

  it('returns only the full name when the short name is missing', () => {
    expect(formatClarisaProjectLabel({ short_name: null, full_name: 'Full' })).toBe('Full');
  });

  it('falls back to "Project #id" using clarisaProjectId, then id, when both names are empty', () => {
    expect(formatClarisaProjectLabel({ clarisaProjectId: 7 })).toBe('Project #7');
    expect(formatClarisaProjectLabel({ id: 8, short_name: '', full_name: '' })).toBe('Project #8');
    expect(formatClarisaProjectLabel({ clarisaProjectId: 7, id: 8 })).toBe('Project #7');
  });

  it('returns an empty string when there is no name and no id', () => {
    expect(formatClarisaProjectLabel({})).toBe('');
  });
});
