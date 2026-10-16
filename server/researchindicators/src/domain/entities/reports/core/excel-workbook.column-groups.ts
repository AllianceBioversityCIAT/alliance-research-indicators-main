import { InternalServerErrorException } from '@nestjs/common';
import type { ExcelSheetPreamble } from './excel-workbook.types';

export type DerivedColumnGroups = {
  columnGroups: ExcelSheetPreamble['columnGroups'];
  lastColumn: number;
};

type SectionEntry = { readonly label: string; readonly fillArgb: string };

/**
 * Walks tagged columns in order and emits one band per contiguous section run.
 * A section that reopens after another section interrupted it throws: the
 * message names the section key, the stray column (first column of the
 * interrupting run) and the column that reopens the section.
 * A catalog entry that no column uses produces no band.
 * `lastColumn` is the column count (banner end).
 */
export function deriveColumnGroups<K extends string>(
  columns: readonly { readonly key: string; readonly section: K }[],
  sections: { readonly [P in K]: SectionEntry },
): DerivedColumnGroups {
  const columnGroups: ExcelSheetPreamble['columnGroups'] = [];
  const closed = new Map<K, { key: string; position: number }>();
  let open: { section: K; fromCol: number } | null = null;

  const throwSplit = (
    section: K,
    reopenKey: string,
    reopenPosition: number,
  ): never => {
    const stray = closed.get(section);
    throw new InternalServerErrorException(
      `Split section ${section}: stray column ${stray.key} at position ${stray.position}; reopened by ${reopenKey} at position ${reopenPosition}`,
    );
  };

  for (let index = 0; index < columns.length; index++) {
    const position = index + 1;
    const column = columns[index];

    if (open === null) {
      if (closed.has(column.section)) {
        throwSplit(column.section, column.key, position);
      }
      open = { section: column.section, fromCol: position };
      continue;
    }

    if (column.section === open.section) {
      continue;
    }

    const entry = sections[open.section];
    columnGroups.push({
      fromCol: open.fromCol,
      toCol: position - 1,
      label: entry.label,
      fillArgb: entry.fillArgb,
    });
    closed.set(open.section, { key: column.key, position });

    if (closed.has(column.section)) {
      throwSplit(column.section, column.key, position);
    }
    open = { section: column.section, fromCol: position };
  }

  if (open !== null) {
    const entry = sections[open.section];
    columnGroups.push({
      fromCol: open.fromCol,
      toCol: columns.length,
      label: entry.label,
      fillArgb: entry.fillArgb,
    });
  }

  return { columnGroups, lastColumn: columns.length };
}
