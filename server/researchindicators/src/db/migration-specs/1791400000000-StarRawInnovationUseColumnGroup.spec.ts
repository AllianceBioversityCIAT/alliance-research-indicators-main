import { QueryRunner } from 'typeorm';
import { StarRawInnovationUseColumnGroup1791400000000 } from '../migrations/1791400000000-StarRawInnovationUseColumnGroup';

/**
 * Structural spec for the Innovation Use layout migration
 * (docs/specs/innovation-use/excel-export T-03, R-IUX-007, NFR-IUX-003).
 *
 * UNIT test (`npm test`) — a fake QueryRunner records SQL and params.
 * It never opens MySQL. Whether the INSERT lands is the fixture's job.
 *
 * CANNOT PROVE (KZ-017): SQL text and the params array. Not that MySQL
 * accepts the statement, not that down() leaves seeded rows in place,
 * and not Dev's real column-group rows (P-11).
 */

const FILL_ARGB = 'FF6A1B9A';
const WORKBOOK = 'star_results_metadata';
const SHEET = 'raw_data';

const DICTIONARY: ReadonlyArray<{
  section: string | null;
  fieldLabel: string;
  explanation: string;
}> = [
  {
    section: 'Innovation Use',
    fieldLabel: 'Innovation use level',
    explanation:
      'Shows the innovation use level as Level followed by the number and the level name. A missing level on an Innovation Use result reads Not provided. Any other indicator reads Not applicable.',
  },
  {
    section: null,
    fieldLabel: 'Use level justification',
    explanation:
      'Free-text justification of the chosen use level. Required when the level is 6 or higher.',
  },
  {
    section: null,
    fieldLabel: 'Actors',
    explanation:
      'One bullet line per actor type, including an optional custom name and either sex and age counts or an aggregate total.',
  },
  {
    section: null,
    fieldLabel: 'Organizations',
    explanation:
      'One bullet line per organization, either a known institution or a type with an optional sub-type and a count.',
  },
  {
    section: null,
    fieldLabel: 'Quantifications',
    explanation:
      'One bullet line per measure, with the number, the unit, and an optional comment. A negative number is valid.',
  },
  {
    section: null,
    fieldLabel: 'Linked innovation development',
    explanation:
      'The linked innovation-development result, shown as platform code, official code, and title. Required on an Innovation Use result.',
  },
  {
    section: null,
    fieldLabel: 'Linked innovation readiness level',
    explanation:
      'Readiness level of the linked innovation development, shown as Level followed by the number and the level name. Shown only when a qualifying link exists.',
  },
  {
    section: null,
    fieldLabel: 'Linked innovation description',
    explanation:
      'Description of the linked innovation development. Shown only when a qualifying link exists.',
  },
  {
    section: null,
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

describe('StarRawInnovationUseColumnGroup1791400000000', () => {
  describe('up()', () => {
    let calls: RecordedCall[];

    beforeAll(async () => {
      const migration = new StarRawInnovationUseColumnGroup1791400000000();
      const recorded = createRecordingQueryRunner();
      await migration.up(recorded.runner);
      calls = recorded.calls;
    });

    it('inserts one column group and one dictionary statement, and never updates', () => {
      for (const call of calls) {
        expect(call.sql).not.toMatch(/\bUPDATE\b/i);
        expect(call.sql).not.toMatch(/\bDELETE\b/i);
      }
      expect(calls).toHaveLength(2);
      expect(calls[0].sql).toMatch(
        /INSERT INTO `report_workbook_column_group`/i,
      );
      expect(calls[1].sql).toMatch(/INSERT INTO `report_data_dictionary`/i);
    });

    it('computes both sort_order values with COALESCE(MAX(sort_order), 0) + k', () => {
      expect(collapse(calls[0].sql)).toContain(
        'COALESCE(base.max_sort, 0) + ?',
      );
      expect(collapse(calls[0].sql)).toContain(
        'WHERE `workbook_key` = ? AND `sheet_key` = ?',
      );
      expect(collapse(calls[1].sql)).toContain(
        'COALESCE(base.max_sort, 0) + dict_row.row_offset',
      );
      expect(collapse(calls[1].sql)).toContain('WHERE `workbook_key` = ?');
      expect(calls[1].sql).not.toMatch(/sheet_key/);
    });

    it('passes the group band 75-83, the label, and the new colour', () => {
      expect(calls[0].params).toEqual([
        WORKBOOK,
        SHEET,
        1,
        75,
        83,
        'INNOVATION USE',
        FILL_ARGB,
        1,
        WORKBOOK,
        SHEET,
      ]);
    });

    it('passes dictionary labels and explanations in column order, section on the first row only', () => {
      const rowParams = DICTIONARY.flatMap((row, index) => [
        index + 1,
        row.section,
        row.fieldLabel,
        row.explanation,
      ]);
      expect(calls[1].params).toEqual([
        WORKBOOK,
        FILL_ARGB,
        WORKBOOK,
        ...rowParams,
      ]);
      expect(DICTIONARY.map((row) => row.fieldLabel)).toEqual([
        'Innovation use level',
        'Use level justification',
        'Actors',
        'Organizations',
        'Quantifications',
        'Linked innovation development',
        'Linked innovation readiness level',
        'Linked innovation description',
        'Linked innovation geographic scope',
      ]);
      expect(DICTIONARY[0].section).toBe('Innovation Use');
      expect(DICTIONARY.slice(1).every((row) => row.section === null)).toBe(
        true,
      );
      expect(DICTIONARY.every((row) => row.explanation.length > 0)).toBe(true);
    });
  });

  describe('down()', () => {
    let calls: RecordedCall[];

    beforeAll(async () => {
      const migration = new StarRawInnovationUseColumnGroup1791400000000();
      const recorded = createRecordingQueryRunner();
      await migration.down(recorded.runner);
      calls = recorded.calls;
    });

    it('deletes exactly the group row and the nine dictionary rows, never by sort_order', () => {
      expect(calls).toHaveLength(2);
      expect(collapse(calls[0].sql)).toBe(
        collapse(`
          DELETE FROM \`report_workbook_column_group\`
          WHERE \`workbook_key\` = ?
            AND \`sheet_key\` = ?
            AND \`label\` = ?
            AND \`from_col\` = ?
            AND \`to_col\` = ?
        `),
      );
      expect(calls[0].params).toEqual([
        WORKBOOK,
        SHEET,
        'INNOVATION USE',
        75,
        83,
      ]);

      const labelPlaceholders = DICTIONARY.map(() => '?').join(', ');
      expect(collapse(calls[1].sql)).toBe(
        collapse(`
          DELETE FROM \`report_data_dictionary\`
          WHERE \`workbook_key\` = ?
            AND \`section_fill_argb\` = ?
            AND \`field_label\` IN (${labelPlaceholders})
            AND (
              \`section\` = ?
              OR \`section\` IS NULL
            )
        `),
      );
      expect(calls[1].params).toEqual([
        WORKBOOK,
        FILL_ARGB,
        ...DICTIONARY.map((row) => row.fieldLabel),
        'Innovation Use',
      ]);

      for (const call of calls) {
        expect(call.sql).not.toMatch(/sort_order/i);
        expect(call.sql).not.toMatch(/\bUPDATE\b/i);
      }
    });
  });
});
