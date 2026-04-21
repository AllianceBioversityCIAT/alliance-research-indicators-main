import { Injectable } from '@nestjs/common';

/**
 * Reorders workbook sheets using an optional comma-separated list of sheet_key values.
 * Keys not listed are appended in their original relative order after the override list.
 */
@Injectable()
export class WorkbookSheetOrderResolver {
  resolve<T extends { sheet_key: string }>(
    dbRows: T[],
    csvOverride: string | undefined,
  ): T[] {
    if (!csvOverride?.trim()) {
      return [...dbRows];
    }
    const keys = csvOverride
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    const byKey = new Map(dbRows.map((r) => [r.sheet_key, r]));
    const ordered: T[] = [];
    for (const k of keys) {
      const row = byKey.get(k);
      if (row) {
        ordered.push(row);
      }
    }
    for (const r of dbRows) {
      if (!ordered.some((o) => o.sheet_key === r.sheet_key)) {
        ordered.push(r);
      }
    }
    return ordered;
  }
}
