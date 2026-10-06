import { QueryRunner } from 'typeorm';
import { StarRawInnovationUseExportSubset1791500000000 } from '../migrations/1791500000000-StarRawInnovationUseExportSubset';

/**
 * Structural spec for the Innovation Use export-subset migration
 * (docs/specs/innovation-use/excel-export T-06, R-IUX-006, R-IUX-007, DD-7).
 *
 * UNIT test (`npm test`) — a fake QueryRunner records SQL and params.
 * It never opens MySQL. Whether the statements land is the fixture's job.
 *
 * CANNOT PROVE (KZ-017): that MySQL accepts the statement, that a
 * label-only DELETE would remove a same-label row from another section,
 * or Dev's real sort_order values (P-16).
 */

const FILL_ARGB = 'FF6A1B9A';
const WORKBOOK = 'star_results_metadata';
const SHEET = 'raw_data';

const ALL_LABELS = [
  'Innovation use level',
  'Use level justification',
  'Actors',
  'Organizations',
  'Quantifications',
  'Linked innovation development',
  'Linked innovation readiness level',
  'Linked innovation description',
  'Linked innovation geographic scope',
];

const EXPORT_ASSIGNMENTS: ReadonlyArray<[string, number]> = [
  ['Innovation use level', 0],
  ['Use level justification', 1],
  ['Linked innovation development', 2],
  ['Actors', 3],
  ['Organizations', 4],
  ['Quantifications', 5],
];

const ORIGINAL_ASSIGNMENTS: ReadonlyArray<[string, number]> = [
  ['Innovation use level', 0],
  ['Use level justification', 1],
  ['Actors', 2],
  ['Organizations', 3],
  ['Quantifications', 4],
  ['Linked innovation development', 5],
];

const DROPPED: ReadonlyArray<{
  offset: number;
  fieldLabel: string;
  explanation: string;
}> = [
  {
    offset: 6,
    fieldLabel: 'Linked innovation readiness level',
    explanation:
      'Readiness level of the linked innovation development, shown as Level followed by the number and the level name. Shown only when a qualifying link exists.',
  },
  {
    offset: 7,
    fieldLabel: 'Linked innovation description',
    explanation:
      'Description of the linked innovation development. Shown only when a qualifying link exists.',
  },
  {
    offset: 8,
    fieldLabel: 'Linked innovation geographic scope',
    explanation:
      'Geographic scope of the linked innovation development. Shown only when a qualifying link exists.',
  },
];

type RecordedCall = { sql: string; params: unknown[] | undefined };

function createRecordingQueryRunner(): {
  runner: QueryRunner;
  calls: RecordedCall[];
} {
  const calls: RecordedCall[] = [];
  const runner = {
    query: jest.fn(async (sql: string, params?: unknown[]) => {
      calls.push({ sql, params });
      return undefined;
    }),
  } as unknown as QueryRunner;
  return { runner, calls };
}

function collapse(sql: string): string {
  return sql.replace(/\s+/g, ' ').trim();
}

function reorderParams(
  minLabels: readonly string[],
  assignments: ReadonlyArray<[string, number]>,
): unknown[] {
  return [
    WORKBOOK,
    FILL_ARGB,
    ...minLabels,
    ...assignments.flatMap(([label, offset]) => [label, offset]),
    WORKBOOK,
    FILL_ARGB,
    ...assignments.map(([label]) => label),
  ];
}

describe('StarRawInnovationUseExportSubset1791500000000', () => {
  describe('up()', () => {
    let calls: RecordedCall[];

    beforeAll(async () => {
      const migration = new StarRawInnovationUseExportSubset1791500000000();
      const recorded = createRecordingQueryRunner();
      await migration.up(recorded.runner);
      calls = recorded.calls;
    });

    it('updates the group, reorders the dictionary, then deletes the three view-only rows', () => {
      expect(calls).toHaveLength(3);
      expect(calls[0].sql).toMatch(/UPDATE `report_workbook_column_group`/i);
      expect(calls[1].sql).toMatch(/UPDATE `report_data_dictionary`/i);
      expect(calls[2].sql).toMatch(/DELETE FROM `report_data_dictionary`/i);
      for (const call of calls) {
        expect(call.sql).not.toMatch(/\bINSERT\b/i);
      }
    });

    it('narrows the group from 83 to 80, keyed by workbook, sheet, label and range', () => {
      expect(collapse(calls[0].sql)).toBe(
        collapse(`
          UPDATE \`report_workbook_column_group\`
          SET \`to_col\` = ?
          WHERE \`workbook_key\` = ?
            AND \`sheet_key\` = ?
            AND \`label\` = ?
            AND \`from_col\` = ?
            AND \`to_col\` = ?
        `),
      );
      expect(calls[0].params).toEqual([
        80,
        WORKBOOK,
        SHEET,
        'INNOVATION USE',
        75,
        83,
      ]);
    });

    it('reorders with MIN(sort_order) plus a bound offset, over the nine Innovation Use labels', () => {
      const sql = collapse(calls[1].sql);
      expect(sql).toContain('MIN(`sort_order`) AS base_sort');
      expect(sql).toContain('iu_base.base_sort + CASE');
      expect(sql).toContain('`section_fill_argb` = ?');
      expect(sql).not.toMatch(/sort_order`\s*=\s*\d+/);
      expect(calls[1].params).toEqual(
        reorderParams(ALL_LABELS, EXPORT_ASSIGNMENTS),
      );
    });

    it('deletes only the three view-only labels, and only on the Innovation Use fill', () => {
      const placeholders = DROPPED.map(() => '?').join(', ');
      expect(collapse(calls[2].sql)).toBe(
        collapse(`
          DELETE FROM \`report_data_dictionary\`
          WHERE \`workbook_key\` = ?
            AND \`section_fill_argb\` = ?
            AND \`field_label\` IN (${placeholders})
        `),
      );
      expect(calls[2].params).toEqual([
        WORKBOOK,
        FILL_ARGB,
        ...DROPPED.map((row) => row.fieldLabel),
      ]);
    });

    it('every statement names the Innovation Use identifiers and no other table', () => {
      for (const call of calls) {
        expect(call.sql).toMatch(/`workbook_key` = \?/);
        expect(call.sql).not.toMatch(
          /report_(?!workbook_column_group|data_dictionary)\w+/i,
        );
      }
      expect(calls[1].sql).toMatch(/`section_fill_argb` = \?/);
      expect(calls[2].sql).toMatch(/`section_fill_argb` = \?/);
    });
  });

  describe('down()', () => {
    let calls: RecordedCall[];

    beforeAll(async () => {
      const migration = new StarRawInnovationUseExportSubset1791500000000();
      const recorded = createRecordingQueryRunner();
      await migration.down(recorded.runner);
      calls = recorded.calls;
    });

    it('restores the six-row order, re-inserts the three rows, then widens the group to 83', () => {
      expect(calls).toHaveLength(3);
      expect(calls[0].sql).toMatch(/UPDATE `report_data_dictionary`/i);
      expect(calls[1].sql).toMatch(/INSERT INTO `report_data_dictionary`/i);
      expect(calls[2].sql).toMatch(/UPDATE `report_workbook_column_group`/i);
    });

    it('restores base+0 through base+5 in the original R-IUX-002…006 order', () => {
      const surviving = EXPORT_ASSIGNMENTS.map(([label]) => label);
      expect(collapse(calls[0].sql)).toContain('iu_base.base_sort + CASE');
      expect(calls[0].params).toEqual(
        reorderParams(surviving, ORIGINAL_ASSIGNMENTS),
      );
    });

    it('re-inserts the three rows with the original explanations, a null section, and base+6…8', () => {
      const sql = collapse(calls[1].sql);
      expect(sql).toContain('iu_base.base_sort + dropped.row_offset');
      expect(sql).toContain('MIN(`sort_order`) AS base_sort');
      expect(sql).toContain('`section_fill_argb` = ?');
      const surviving = EXPORT_ASSIGNMENTS.map(([label]) => label);
      const rowParams = DROPPED.flatMap((row) => [
        row.offset,
        null,
        row.fieldLabel,
        row.explanation,
      ]);
      expect(calls[1].params).toEqual([
        WORKBOOK,
        FILL_ARGB,
        WORKBOOK,
        FILL_ARGB,
        ...surviving,
        ...rowParams,
      ]);
    });

    it('sets the group to_col back to 83, matched on the narrowed range', () => {
      expect(calls[2].params).toEqual([
        83,
        WORKBOOK,
        SHEET,
        'INNOVATION USE',
        75,
        80,
      ]);
    });
  });
});
