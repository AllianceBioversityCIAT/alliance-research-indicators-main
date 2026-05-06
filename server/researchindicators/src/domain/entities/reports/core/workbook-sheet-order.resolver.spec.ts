import { WorkbookSheetOrderResolver } from './workbook-sheet-order.resolver';

describe('WorkbookSheetOrderResolver', () => {
  let resolver: WorkbookSheetOrderResolver;

  beforeEach(() => {
    resolver = new WorkbookSheetOrderResolver();
  });

  it('returns a copy when override is empty', () => {
    const rows = [
      { sheet_key: 'a', n: 1 },
      { sheet_key: 'b', n: 2 },
    ];
    const out = resolver.resolve(rows, undefined);
    expect(out).toEqual(rows);
    expect(out).not.toBe(rows);
  });

  it('returns a copy when override is whitespace only', () => {
    const rows = [{ sheet_key: 'a' }];
    const out = resolver.resolve(rows, '  \t  ');
    expect(out).toEqual(rows);
  });

  it('orders by override keys and appends missing rows', () => {
    const rows = [
      { sheet_key: 'raw', id: 1 },
      { sheet_key: 'dict', id: 2 },
    ];
    const out = resolver.resolve(rows, 'dict,raw,unknown');
    expect(out.map((r) => r.sheet_key)).toEqual(['dict', 'raw']);
  });

  it('appends keys not in override preserving relative order', () => {
    const rows = [
      { sheet_key: 'x', id: 1 },
      { sheet_key: 'y', id: 2 },
      { sheet_key: 'z', id: 3 },
    ];
    const out = resolver.resolve(rows, 'z');
    expect(out.map((r) => r.sheet_key)).toEqual(['z', 'x', 'y']);
  });

  it('ignores empty segments in csv override', () => {
    const rows = [{ sheet_key: 'a' }, { sheet_key: 'b' }];
    const out = resolver.resolve(rows, 'b,, a');
    expect(out.map((r) => r.sheet_key)).toEqual(['b', 'a']);
  });
});
