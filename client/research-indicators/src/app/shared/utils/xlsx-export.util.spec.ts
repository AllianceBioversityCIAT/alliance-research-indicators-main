import { buildExportRows, exportRowsToXlsx, XlsxExportColumn } from './xlsx-export.util';

interface Row {
  id: number;
  code: string;
  value: string;
}

const columns: XlsxExportColumn<Row>[] = [
  { field: 'id', header: 'ID' },
  { field: 'code', header: 'Code' },
  { field: 'value', header: 'Value' }
];

describe('xlsx-export.util', () => {
  // Pure, library-free: no `exceljs` import happens when only buildExportRows is exercised —
  // design §6.3's requirement that the row builder be testable without the dependency.
  describe('buildExportRows', () => {
    it('builds a header row followed by one row per entry, reading each configured field', () => {
      const rows: Row[] = [
        { id: 1, code: 'UOM-1', value: 'Percentage' },
        { id: 2, code: 'UOM-2', value: 'Count' }
      ];

      expect(buildExportRows({ columns, rows })).toEqual([
        ['ID', 'Code', 'Value'],
        [1, 'UOM-1', 'Percentage'],
        [2, 'UOM-2', 'Count']
      ]);
    });

    // "a given order that differs from id order is kept" (tasks.md T-03 client unit) — the
    // builder must never re-sort; whatever order the caller (DataTable) hands it is preserved.
    it('keeps the given row order even when it differs from id order (does not re-sort)', () => {
      const rows: Row[] = [
        { id: 3, code: 'UOM-10', value: 'Score (0-100)' },
        { id: 1, code: 'UOM-1', value: 'Percentage' },
        { id: 2, code: 'UOM-2', value: 'Count' }
      ];

      const built = buildExportRows({ columns, rows });

      expect(built.slice(1)).toEqual([
        [3, 'UOM-10', 'Score (0-100)'],
        [1, 'UOM-1', 'Percentage'],
        [2, 'UOM-2', 'Count']
      ]);
    });

    it('falls back to an empty string for a null/undefined field value', () => {
      const rows = [{ id: 1, code: 'L1', value: undefined as unknown as string }];
      expect(buildExportRows({ columns, rows })).toEqual([
        ['ID', 'Code', 'Value'],
        [1, 'L1', '']
      ]);
    });

    it('returns only the header row for an empty row set', () => {
      expect(buildExportRows({ columns, rows: [] })).toEqual([['ID', 'Code', 'Value']]);
    });
  });

  // exportRowsToXlsx: the dynamic-import + download path. `exceljs` is the REAL library here
  // (not mocked) — jest-preset-angular transpiles `import()` to a `require()` under the hood, so
  // this also exercises that the dynamic import actually resolves to a working `ExcelJS.Workbook`.
  // The browser download primitives (`URL.createObjectURL`, the anchor click) are stubbed the
  // same way as `results-center-table.component.spec.ts::exportTable`, since jsdom does not
  // implement `createObjectURL`.
  describe('exportRowsToXlsx', () => {
    let createObjectURLSpy: jest.Mock;
    let revokeObjectURLSpy: jest.Mock;
    let originalURL: typeof URL;
    let originalCreateElement: typeof document.createElement;
    let originalAppendChild: typeof document.body.appendChild;
    let linkElement: { click: jest.Mock; style: { display: string }; href: string; download: string; remove: jest.Mock };

    beforeEach(() => {
      createObjectURLSpy = jest.fn().mockReturnValue('blob:xlsx-export');
      revokeObjectURLSpy = jest.fn();
      originalURL = globalThis.URL;
      (globalThis as unknown as { URL: unknown }).URL = {
        createObjectURL: createObjectURLSpy,
        revokeObjectURL: revokeObjectURLSpy
      };

      linkElement = { click: jest.fn(), style: { display: '' }, href: '', download: '', remove: jest.fn() };
      originalCreateElement = document.createElement.bind(document);
      originalAppendChild = document.body.appendChild.bind(document.body);
      document.createElement = ((tagName: string) =>
        tagName === 'a' ? (linkElement as unknown as HTMLElement) : originalCreateElement(tagName)) as typeof document.createElement;
      document.body.appendChild = jest.fn((node: unknown) =>
        node === linkElement ? (node as Node) : originalAppendChild(node as Node)
      ) as typeof document.body.appendChild;
    });

    afterEach(() => {
      globalThis.URL = originalURL;
      document.createElement = originalCreateElement;
      document.body.appendChild = originalAppendChild;
      jest.useRealTimers();
      // Restores the `setTimeout` spy below (and any other jest.spyOn in this file) — plain
      // `jest.fn()` reassignments like createObjectURLSpy/revokeObjectURLSpy are unaffected.
      jest.restoreAllMocks();
    });

    // Leader-verified root cause (K-004 rework, reproduced 2/3 full-suite runs, passed alone):
    // `jest.useFakeTimers()` raced the REAL `exceljs` (JSZip) internal scheduling against
    // `await jest.runAllTimersAsync()` — under suite load, module compile could still be in
    // flight when the drain ran and executed BEFORE exceljs's own timers/setImmediate calls were
    // even scheduled, so `exportPromise` never settled and the test hit the default 5000 ms
    // timeout. Fix: run on REAL timers end-to-end (no `jest.useFakeTimers()`), which removes the
    // race entirely for exceljs's internals — nothing about them is mocked here. Only THIS
    // util's OWN 100 ms cleanup timer is intercepted (captured, not auto-run), so the final
    // assertions are deterministic and never depend on that wall-clock delay actually elapsing —
    // no fixed sleep anywhere in this test.
    it('writes a workbook, downloads it via an object URL, and revokes the URL afterwards', async () => {
      const realSetTimeout = globalThis.setTimeout;
      let revokeCallback: (() => void) | undefined;
      jest.spyOn(globalThis, 'setTimeout').mockImplementation(((handler: () => void, timeout?: number, ...args: unknown[]) => {
        if (timeout === 100) {
          revokeCallback = handler;
          return 0 as unknown as ReturnType<typeof setTimeout>;
        }
        // Anything else (e.g. exceljs/JSZip's own internal scheduling) still runs on a REAL
        // timer, unmocked — only the util's known 100 ms cleanup call is captured above.
        return realSetTimeout(handler, timeout, ...args);
      }) as typeof setTimeout);

      const rows: Row[] = [{ id: 1, code: 'UOM-1', value: 'Percentage' }];

      const exportPromise = exportRowsToXlsx({ columns, rows, fileName: 'control-list-values.xlsx' });
      await exportPromise;

      expect(createObjectURLSpy).toHaveBeenCalledTimes(1);
      const [blobArg] = createObjectURLSpy.mock.calls[0];
      expect(blobArg).toBeInstanceOf(Blob);
      expect(blobArg.type).toBe('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      expect(linkElement.download).toBe('control-list-values.xlsx');
      expect(linkElement.href).toBe('blob:xlsx-export');
      expect(linkElement.click).toHaveBeenCalledTimes(1);

      // The cleanup timer is scheduled but intentionally not auto-run (see spy above) — invoke
      // it directly, deterministically, instead of waiting on its real 100 ms delay.
      expect(revokeCallback).toBeDefined();
      expect(revokeObjectURLSpy).not.toHaveBeenCalled();
      revokeCallback?.();

      expect(linkElement.remove).toHaveBeenCalledTimes(1);
      expect(revokeObjectURLSpy).toHaveBeenCalledWith('blob:xlsx-export');
    }, 30000);
  });
});
