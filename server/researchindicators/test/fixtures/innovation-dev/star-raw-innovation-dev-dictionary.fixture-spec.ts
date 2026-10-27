import type { QueryRunner } from 'typeorm';
import { dataSource } from '../../../src/db/config/mysql/orm.test.config';
import { StarRawInnovationDevDictionary1791800000000 } from '../../../src/db/migrations/1791800000000-StarRawInnovationDevDictionary';

/**
 * T-03 (docs/specs/innovation-dev/excel-export) — dictionary round trip
 * on scratch. The baseline does not contain the Innovation details seed,
 * so this file builds the anchor, the 27 seed rows at seed sort + 1, and
 * 2 OICR rows inside a transaction that always rolls back. It leaves the
 * Innovation Use rows already applied by 1791400000000 and 1791500000000
 * in place and asserts they are unchanged.
 *
 * No result_official_code band (FP-45). This file does not insert into
 * results.
 *
 * What this file cannot reach (KZ-017): Dev's and Prod's real dictionary
 * rows (P-14). A green run does not leave the seeded pre-state behind.
 */

jest.setTimeout(60_000);

const WORKBOOK = 'star_results_metadata';
const IU_FILL = 'FF6A1B9A';
const DEV_FILL = 'FF00897B';
const OICR_FILL = 'FFAD1457';

const IU_LABELS = [
  'Innovation use level',
  'Use level justification',
  'Linked innovation development',
  'Actors',
  'Organizations',
  'Quantifications',
] as const;

/** design §3.2a, column order 81–112. */
const FINAL_LABELS = [
  'Short title',
  'Innovation nature',
  'Innovation type',
  'New or improved variety or breed',
  'Number of new or improved lines/varieties',
  'Innovation readiness level',
  'Readiness explanation',
  'Anticipated users',
  'Sex and age disaggregation not applicable',
  'Actors',
  'Organizations',
  'Intended beneficiaries/users elaborated',
  'Expected outcomes',
  'Potential for researchers/policymakers adaptation',
  'Method/tool qualifies for dissemination',
  'Context for tool usefulness',
  'Results detailed with examples',
  'Tool function',
  'Innovation used beyond original context',
  'Adopted and adapted in other contexts',
  'Tools often used together',
  'Other tools',
  "Other tools' usage with this one description",
  'Formulation: Is it cheaper compared to alternatives?',
  'Formulation: Is it simpler to use?',
  'Formulation: Does it perform better?',
  'Demand and Investment: Is the innovation desirable to intended users?',
  'Demand and Investment: Is the innovation commercially viable/is there investment potential?',
  'Sustained use: Is the innovation supported by a suitable enabling environment?',
  'Sustained use: Is there already evidence of uptake?',
  'Sustained use: Is there potential for actor in new contexts and for new purposes?',
  'Expansion and adaptation details',
] as const;

/**
 * Seed labels byte-exact, including newlines and trailing spaces.
 * Live sort_order in the pre-state is seedSort + 1 (P-17).
 */
const SEED_BLOCK: ReadonlyArray<{
  seedSort: number;
  label: string;
}> = [
  { seedSort: 58, label: 'Short title' },
  { seedSort: 59, label: 'Innovation nature' },
  { seedSort: 60, label: 'Innovation type' },
  { seedSort: 61, label: 'Innovation readiness level' },
  { seedSort: 62, label: 'Readiness explanation ' },
  { seedSort: 63, label: 'Actors' },
  { seedSort: 64, label: 'Organizations' },
  { seedSort: 65, label: 'Intended beneficiaries/users elaborated\n' },
  { seedSort: 66, label: 'Expected outcomes ' },
  {
    seedSort: 67,
    label: 'Potential for researchers/policymakers adaptation',
  },
  { seedSort: 68, label: 'Method/tool qualifies for dissemination\n' },
  { seedSort: 69, label: 'Context for tool usefulness' },
  { seedSort: 70, label: 'Results detailed with examples' },
  { seedSort: 71, label: 'Tool function' },
  { seedSort: 72, label: 'Innovation used beyond original context' },
  { seedSort: 73, label: 'Adopted and adapted in other contexts' },
  { seedSort: 74, label: 'Tools often used together' },
  { seedSort: 75, label: 'Other tools' },
  { seedSort: 76, label: "Other tools' usage with this one description" },
  {
    seedSort: 77,
    label: 'Formulation:\nIs it cheaper compared to alternatives?',
  },
  { seedSort: 78, label: 'Formulation: Is it simpler to use?' },
  { seedSort: 79, label: 'Formulation: Does it perform better?' },
  {
    seedSort: 80,
    label:
      'Demand and Investment: \nIs the innovation desirable to intended\nusers?',
  },
  {
    seedSort: 81,
    label:
      'Demand and Investment: Is the innovation commercially viable/is there\ninvestment potential?',
  },
  {
    seedSort: 82,
    label:
      'Sustained use: Is the innovation supported by a suitable enabling\nenvironment?',
  },
  {
    seedSort: 83,
    label: 'Sustained use: Is there already evidence of\nuptake? ',
  },
  {
    seedSort: 84,
    label:
      'Sustained use: Is there potential for actor in new contexts and for new purposes? ',
  },
];

type PlainRow = Record<string, unknown>;

function plain(rows: PlainRow[]): PlainRow[] {
  return rows.map((row) => ({ ...row }));
}

async function snapshot(qr: QueryRunner): Promise<{
  groups: PlainRow[];
  dictionary: PlainRow[];
}> {
  const groups = plain(
    (await qr.query(
      `
      SELECT report_workbook_column_group_id, workbook_key, sheet_key,
             sort_order, from_col, to_col, label, fill_argb, is_active
      FROM report_workbook_column_group
      WHERE workbook_key = ?
      ORDER BY report_workbook_column_group_id
      `,
      [WORKBOOK],
    )) as PlainRow[],
  );
  const dictionary = plain(
    (await qr.query(
      `
      SELECT report_data_dictionary_id, workbook_key, section, field_label,
             explanation, section_fill_argb, sort_order, is_active
      FROM report_data_dictionary
      WHERE workbook_key = ?
      ORDER BY report_data_dictionary_id
      `,
      [WORKBOOK],
    )) as PlainRow[],
  );
  return { groups, dictionary };
}

function innovationUseRows(dictionary: PlainRow[]): PlainRow[] {
  return dictionary
    .filter((row) => row.section_fill_argb === IU_FILL)
    .sort((left, right) => Number(left.sort_order) - Number(right.sort_order));
}

async function insertDictionary(
  qr: QueryRunner,
  row: {
    section: string | null;
    label: string;
    sortOrder: number;
    fill: string | null;
  },
): Promise<void> {
  await qr.query(
    `
    INSERT INTO report_data_dictionary
      (workbook_key, section, field_label, explanation, sort_order, is_active, section_fill_argb)
    VALUES (?, ?, ?, NULL, ?, 1, ?)
    `,
    [WORKBOOK, row.section, row.label, row.sortOrder, row.fill],
  );
}

async function seedPreState(qr: QueryRunner): Promise<void> {
  await qr.query(
    `
    DELETE FROM report_data_dictionary
    WHERE workbook_key = ?
      AND (section_fill_argb IS NULL OR section_fill_argb <> ?)
    `,
    [WORKBOOK, IU_FILL],
  );

  await insertDictionary(qr, {
    section: null,
    label: 'Link to Innovation Dev',
    sortOrder: 56 + 1,
    fill: null,
  });
  await insertDictionary(qr, {
    section: null,
    label: 'Link to Innovation Use',
    sortOrder: 57 + 1,
    fill: null,
  });

  for (const [index, row] of SEED_BLOCK.entries()) {
    await insertDictionary(qr, {
      section: index === 0 ? 'Innovation details' : null,
      label: row.label,
      sortOrder: row.seedSort + 1,
      fill: index === 0 ? DEV_FILL : null,
    });
  }

  await insertDictionary(qr, {
    section: 'OICRS',
    label: 'Strategic outcomes',
    sortOrder: 85 + 1,
    fill: OICR_FILL,
  });
  await insertDictionary(qr, {
    section: null,
    label: 'MEL Regional Expert',
    sortOrder: 86 + 1,
    fill: null,
  });
}

async function maxSort(qr: QueryRunner): Promise<number> {
  const rows = (await qr.query(
    `
    SELECT MAX(sort_order) AS max_sort
    FROM report_data_dictionary
    WHERE workbook_key = ?
    `,
    [WORKBOOK],
  )) as Array<{ max_sort: number }>;
  return Number(rows[0].max_sort);
}

async function band(qr: QueryRunner, base: number): Promise<PlainRow[]> {
  return plain(
    (await qr.query(
      `
      SELECT report_data_dictionary_id, section, field_label, explanation,
             section_fill_argb, sort_order, is_active
      FROM report_data_dictionary
      WHERE workbook_key = ?
        AND sort_order BETWEEN ? AND ?
      ORDER BY sort_order
      `,
      [WORKBOOK, base + 1, base + FINAL_LABELS.length],
    )) as PlainRow[],
  );
}

describe('StarRawInnovationDevDictionary round trip (T-03)', () => {
  const migration = new StarRawInnovationDevDictionary1791800000000();

  beforeAll(async () => {
    if (!dataSource.isInitialized) {
      await dataSource.initialize();
    }
  });

  afterAll(async () => {
    if (dataSource.isInitialized) {
      await dataSource.destroy();
    }
  });

  async function inTransaction(
    body: (qr: QueryRunner) => Promise<void>,
  ): Promise<void> {
    const qr = dataSource.createQueryRunner();
    await qr.connect();
    await qr.startTransaction();
    try {
      await body(qr);
    } finally {
      await qr.rollbackTransaction();
      await qr.release();
    }
  }

  it('up then down then up keeps Innovation Use rows and restores the shifted pre-state', async () => {
    await inTransaction(async (qr) => {
      const iuBeforeDelete = innovationUseRows((await snapshot(qr)).dictionary);
      expect(iuBeforeDelete.map((row) => row.field_label)).toEqual([
        ...IU_LABELS,
      ]);

      await seedPreState(qr);
      const before = await snapshot(qr);
      const iuBefore = innovationUseRows(before.dictionary);
      expect(iuBefore.map((row) => row.field_label)).toEqual([...IU_LABELS]);

      const anchor = before.dictionary.find(
        (row) => row.field_label === 'Link to Innovation Use',
      );
      expect(anchor?.sort_order).toBe(57 + 1);
      const seeded = SEED_BLOCK.map((row) =>
        before.dictionary.find((item) => item.sort_order === row.seedSort + 1),
      );
      expect(seeded.every((row) => row !== undefined)).toBe(true);
      expect(seeded.map((row) => row?.field_label)).toEqual(
        SEED_BLOCK.map((row) => row.label),
      );
      expect(seeded.map((row) => row?.sort_order)).toEqual(
        SEED_BLOCK.map((row) => row.seedSort + 1),
      );
      expect(seeded.every((row) => row?.explanation === null)).toBe(true);
      expect(seeded[0]?.section).toBe('Innovation details');
      expect(seeded[0]?.section_fill_argb).toBe(DEV_FILL);
      expect(
        seeded.slice(1).every((row) => row?.section_fill_argb === null),
      ).toBe(true);

      const base = await maxSort(qr);
      await migration.up(qr);

      const afterUp = await snapshot(qr);
      expect(innovationUseRows(afterUp.dictionary)).toEqual(iuBefore);
      expect(afterUp.groups).toEqual(before.groups);
      const placed = await band(qr, base);
      expect(placed).toHaveLength(FINAL_LABELS.length);
      expect(placed.map((row) => row.field_label)).toEqual([...FINAL_LABELS]);
      expect(placed.map((row) => row.sort_order)).toEqual(
        FINAL_LABELS.map((_, index) => base + index + 1),
      );
      expect(placed[0]?.section).toBe('Innovation Development');
      expect(placed[0]?.section_fill_argb).toBe(DEV_FILL);
      expect(placed.slice(1).every((row) => row.section === null)).toBe(true);
      expect(
        placed.slice(1).every((row) => row.section_fill_argb === null),
      ).toBe(true);
      expect(
        placed.every(
          (row) =>
            typeof row.explanation === 'string' && row.explanation.length > 0,
        ),
      ).toBe(true);
      expect(
        afterUp.dictionary.some((row) => row.section === 'Innovation details'),
      ).toBe(false);
      expect(innovationUseRows(afterUp.dictionary)).toEqual(iuBefore);
      expect(afterUp.groups).toEqual(before.groups);

      await migration.down(qr);
      const afterDown = await snapshot(qr);
      expect(afterDown.dictionary).toEqual(before.dictionary);
      expect(afterDown.groups).toEqual(before.groups);
      expect(innovationUseRows(afterDown.dictionary)).toEqual(iuBefore);

      await migration.up(qr);
      const again = await band(qr, base);
      expect(again.map((row) => row.field_label)).toEqual([...FINAL_LABELS]);
      expect(innovationUseRows((await snapshot(qr)).dictionary)).toEqual(
        iuBefore,
      );
    });
  });

  it('an altered seed label makes up throw and leaves every row unchanged', async () => {
    await inTransaction(async (qr) => {
      await seedPreState(qr);
      await qr.query(
        `
        UPDATE report_data_dictionary
        SET field_label = ?
        WHERE workbook_key = ?
          AND field_label = ?
          AND sort_order = ?
        `,
        ['Short title changed', WORKBOOK, 'Short title', 58 + 1],
      );
      const before = await snapshot(qr);

      await expect(migration.up(qr)).rejects.toThrow(/dictionary guard/);

      const after = await snapshot(qr);
      expect(after.dictionary).toEqual(before.dictionary);
      expect(after.groups).toEqual(before.groups);
    });
  });
});
