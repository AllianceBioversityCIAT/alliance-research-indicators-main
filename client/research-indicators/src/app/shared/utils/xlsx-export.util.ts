// @akili-spec institutional-performance/control-lists T-03 (client half) — design §6.3, D-CTL-6,
// P-3; requirements R-CTL-009 "Export respects filter and sort".
//
// `exceljs` is a listed client dependency (P-3) that no client code imported before this task.
// It is loaded with a dynamic `import()` so it never enters the initial bundle (design §6.3 —
// verified at build time: `ng build` must show it only in a lazy chunk, never in `main`).
//
// `buildExportRows` is deliberately library-free (no `exceljs` import at module scope) so it can
// be unit-tested without pulling the dependency in — it is the thing the "export row builder:
// a given order that differs from id order is kept" test (tasks.md T-03) exercises directly.
// It never re-sorts: the caller (the shared `DataTable`, design §6.3) is the one that hands it
// rows already filtered and sorted, across all pages (falsifier 5 — exporting only the current
// page must NOT happen here or in the caller).

/** One exported column: `field` reads the row property, `header` is the sheet's column title. */
export interface XlsxExportColumn<T> {
  field: keyof T & string;
  header: string;
}

export interface XlsxExportInput<T> {
  columns: XlsxExportColumn<T>[];
  rows: T[];
  fileName: string;
}

/**
 * Pure row-builder: header row + one data row per entry of `rows`, in the exact order given.
 * No sorting, no filtering, no `exceljs` import — unit-testable on its own (design §6.3).
 */
export function buildExportRows<T extends object>(input: Pick<XlsxExportInput<T>, 'columns' | 'rows'>): unknown[][] {
  const header = input.columns.map(column => column.header);
  const dataRows = input.rows.map(row => input.columns.map(column => row[column.field] ?? ''));
  return [header, ...dataRows];
}

/**
 * Builds an `.xlsx` workbook from `buildExportRows` and triggers a browser download via an
 * object URL — the same technique as the Results Center export
 * (`results-center-table.component.ts::exportTable`): a `Blob`, `URL.createObjectURL`, a hidden
 * `<a download>` clicked programmatically, then `URL.revokeObjectURL` after a tick.
 *
 * `exceljs` is imported here, inside the function body, so the dynamic `import()` is the only
 * place that pulls the library in — it resolves to a lazy chunk, never the initial bundle.
 */
export async function exportRowsToXlsx<T extends object>(input: XlsxExportInput<T>): Promise<void> {
  const ExcelJS = await import('exceljs');
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Values');

  for (const row of buildExportRows(input)) {
    worksheet.addRow(row);
  }

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = globalThis.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = input.fileName;
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  setTimeout(() => {
    link.remove();
    globalThis.URL.revokeObjectURL(url);
  }, 100);
}
