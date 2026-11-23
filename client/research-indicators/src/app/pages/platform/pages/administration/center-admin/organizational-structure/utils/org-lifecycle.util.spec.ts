import { row } from '../../../../../../../testing/org-structure.fixture';
import { defaultLifecycleYear, deleteMode, lifecycleYears, serverMessage, successorOptions } from './org-lifecycle.util';

// @akili-spec institutional-performance/organizational-structure T-03 (client half) — design §5.4, §5.5;
// requirements R-ORG-005, 007, 008. Pure functions, so these read the values directly.

const RANGE = { min: 2025, max: 2028, current: 2027 };
const ENTRY = row({ id: 1, code: 'ORG-1', levelCode: 'L4', name: 'Unit A' });

describe('org-lifecycle.util', () => {
  describe('successorOptions', () => {
    it('keeps only the same level, active in the year, never the entry itself', () => {
      const candidates = [
        ENTRY,
        row({ id: 2, code: 'ORG-2', levelCode: 'L4', name: 'Unit B' }),
        row({ id: 3, code: 'ORG-3', levelCode: 'L3', name: 'Office C' }),
        row({ id: 4, code: 'ORG-4', levelCode: 'L4', name: 'Unit D', status: 'inactive', statusFromYear: 2027 }),
        row({ id: 5, code: 'ORG-5', levelCode: 'L4', name: 'Unit E', status: 'inactive', statusFromYear: 2029 })
      ];

      expect(successorOptions(candidates, ENTRY, 2027).map(o => o.id)).toEqual([2, 5]);
      expect(successorOptions(candidates, ENTRY, 2029).map(o => o.id)).toEqual([2]);
    });
  });

  describe('years', () => {
    it('offers the current year on, and earlier years only with back-date', () => {
      expect(lifecycleYears('inactivate', RANGE, false, ENTRY)).toEqual([2027, 2028]);
      expect(lifecycleYears('inactivate', RANGE, true, ENTRY)).toEqual([2025, 2026, 2027, 2028]);
    });

    it('a reactivation never precedes the year the entry ended from', () => {
      const ended = row({ id: 9, code: 'ORG-9', levelCode: 'L4', name: 'Gone', status: 'inactive', statusFromYear: 2026 });

      expect(lifecycleYears('reactivate', RANGE, true, ended)).toEqual([2026, 2027, 2028]);
      expect(defaultLifecycleYear('reactivate', 2027, ended)).toBe(2027);
      expect(defaultLifecycleYear('reactivate', 2027, { ...ended, statusFromYear: 2028 })).toBe(2028);
      expect(defaultLifecycleYear('inactivate', 2027, ended)).toBe(2027);
    });
  });

  describe('deleteMode (design §5.5)', () => {
    it('is physical when the first version starts in the current year or later, else logical', () => {
      expect(deleteMode(2027, 2027)).toBe('physical');
      expect(deleteMode(2028, 2027)).toBe('physical');
      expect(deleteMode(2026, 2027)).toBe('logical');
      expect(deleteMode(null, 2027)).toBeNull();
    });
  });

  describe('serverMessage', () => {
    const rejected = (errors: unknown) => ({ successfulRequest: false, errorDetail: { errors } }) as never;

    it('reads the server text from a string, a list or an object, and falls back otherwise', () => {
      expect(serverMessage(rejected('  Has 2 active children.  '), 'x')).toBe('Has 2 active children.');
      expect(serverMessage(rejected(['a', 'b']), 'x')).toBe('a b');
      expect(serverMessage(rejected({ description: 'Linked records: 5' }), 'x')).toBe('Linked records: 5');
      expect(serverMessage(rejected({ description: '' }), 'fallback')).toBe('fallback');
      expect(serverMessage(undefined, 'fallback')).toBe('fallback');
    });
  });
});
