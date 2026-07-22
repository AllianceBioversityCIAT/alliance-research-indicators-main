import {
  updateArray,
  filterPersistKey,
  validTypeOfArray,
  isNotEmpty,
  formatDataToArray,
  isArrayOfType,
  intersection,
  mergeArraysWithPriority,
  getItemsAtLevel,
  filterByUniqueKeyWithPriority,
  removeDuplicatesByKeys,
} from './array.util';
import { AuditableEntity } from '../global-dto/auditable.entity';

describe('array.util', () => {
  describe('updateArray', () => {
    it('should merge backend into client by comparison key', () => {
      const client = [{ iso: 'CO', name: 'c' }] as any[];
      const backend = [{ iso: 'CO', id: 1, x: 2 }] as any[];
      const out = updateArray(
        client,
        backend,
        'iso',
        { key: 'result_id', value: 9 },
        'id',
      );
      expect(out.some((r) => r.is_active === true && r.id === 1)).toBe(true);
    });

    it('should push inactive row when not in client and not in notDeleteIds', () => {
      const out = updateArray(
        [],
        [{ k: 'only', id: 5 }] as any[],
        'k',
        { key: 'pid', value: 1 },
        'id',
      );
      expect(out).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ is_active: false, k: 'only', pid: 1 }),
        ]),
      );
    });

    it('should skip push when id in notDeleteIds', () => {
      const out = updateArray(
        [],
        [{ k: 'x', id: 99 }] as any[],
        'k',
        { key: 'pid', value: 1 },
        'id',
        [99],
      );
      expect(out.find((r) => r.k === 'x')).toBeUndefined();
    });

    it('should coerce null clientArray to empty', () => {
      const out = updateArray(null as any, [], 'id', { key: 'r', value: 1 });
      expect(Array.isArray(out)).toBe(true);
    });
  });

  describe('filterPersistKey', () => {
    it('should map primary keys from partial rows', () => {
      type Row = AuditableEntity & { foo_id: number };
      const data = [
        { foo_id: 1, is_active: true },
        { foo_id: undefined, is_active: true },
      ] as Partial<Row>[];
      const ids = filterPersistKey<Row>('foo_id', data);
      expect(ids).toContain(1);
    });
  });

  describe('validTypeOfArray', () => {
    it('should strip non-alphanumeric from stringified items except slash', () => {
      expect(validTypeOfArray(['a-b', '12#', 'foo/bar'])).toEqual([
        'ab',
        '12',
        'foo/bar',
      ]);
    });
  });

  describe('isNotEmpty', () => {
    it('should return false for null, undefined, empty array', () => {
      expect(isNotEmpty(null as any)).toBe(false);
      expect(isNotEmpty(undefined as any)).toBe(false);
      expect(isNotEmpty([])).toBe(false);
    });

    it('should return true for non-empty', () => {
      expect(isNotEmpty([1])).toBe(true);
      expect(isNotEmpty('x')).toBe(true);
    });
  });

  describe('formatDataToArray', () => {
    it('should wrap non-array', () => {
      expect(formatDataToArray(1 as any)).toEqual([1]);
    });

    it('should return empty for empty input', () => {
      expect(formatDataToArray(null as any)).toEqual([]);
    });
  });

  describe('isArrayOfType', () => {
    it('should narrow when every element passes guard', () => {
      const arr = [1, 2];
      const isNum = (x: unknown): x is number => typeof x === 'number';
      expect(isArrayOfType(arr, isNum)).toBe(true);
    });

    it('should fail when one element fails', () => {
      expect(
        isArrayOfType([1, 'a'], (x): x is number => typeof x === 'number'),
      ).toBe(false);
    });
  });

  describe('intersection', () => {
    it('should return common elements', () => {
      expect(intersection([1, 2, 3], [2, 4])).toEqual([2]);
    });
  });

  describe('mergeArraysWithPriority', () => {
    it('should append items from B not in A by key', () => {
      const a = [{ id: 1 }] as any[];
      const b = [{ id: 1 }, { id: 2 }] as any[];
      expect(mergeArraysWithPriority(a, b, 'id')).toEqual([
        { id: 1 },
        { id: 2 },
      ]);
    });
  });

  describe('getItemsAtLevel', () => {
    type N = { id: number; children?: N[] };
    const tree: N[] = [{ id: 1, children: [{ id: 2, children: [{ id: 3 }] }] }];

    it('should return empty when level < 1', () => {
      expect(getItemsAtLevel(tree, 0)).toEqual([]);
    });

    it('should strip children at level 1', () => {
      expect(getItemsAtLevel(tree, 1)).toEqual([{ id: 1 }]);
    });

    it('should recurse for deeper levels', () => {
      expect(getItemsAtLevel(tree, 3).map((x) => x.id)).toContain(3);
    });
  });

  describe('filterByUniqueKeyWithPriority', () => {
    it('should prefer item with priority field set', () => {
      const arr = [
        { k: 1, p: null },
        { k: 1, p: 1 },
      ] as any[];
      expect(filterByUniqueKeyWithPriority(arr, 'k', 'p')).toEqual([
        { k: 1, p: 1 },
      ]);
    });
  });

  describe('removeDuplicatesByKeys', () => {
    it('should dedupe by composite key', () => {
      expect(
        removeDuplicatesByKeys(
          [
            { a: 1, b: 2 },
            { a: 1, b: 2 },
            { a: 2, b: 2 },
          ],
          ['a', 'b'],
        ),
      ).toHaveLength(2);
    });

    it('should treat empty values as same composite key', () => {
      expect(
        removeDuplicatesByKeys(
          [
            { a: null, b: 1 },
            { a: undefined, b: 2 },
          ],
          ['a'],
        ),
      ).toHaveLength(1);
    });
  });
});
