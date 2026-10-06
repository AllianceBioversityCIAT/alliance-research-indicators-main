import type { QueryRunner } from 'typeorm';
import { dataSource } from '../../../src/db/config/mysql/orm.test.config';
import { StarRawInnovationUseColumnGroup1791400000000 } from '../../../src/db/migrations/1791400000000-StarRawInnovationUseColumnGroup';
import { StarRawInnovationUseExportSubset1791500000000 } from '../../../src/db/migrations/1791500000000-StarRawInnovationUseExportSubset';

/**
 * T-06 (docs/specs/innovation-use/excel-export) — export-subset round
 * trip on scratch. Seeds the ten fallback groups and dictionary rows
 * around the Innovation Use block, including a same-label row for one
 * of the three deleted labels under a different fill. An empty table
 * cannot show a mis-keyed DELETE (task Disqualifier).
 *
 * No result_official_code band (FP-45). This file does not insert into
 * results, and it does not create or tear down the four global-setup
 * rows.
 *
 * What this file cannot reach (KZ-017): Dev's real sort_order values
 * (P-16) and the visual rendering. The transaction is rolled back, so
 * a green run does not change the schema migration:test:execute leaves.
 */

jest.setTimeout(60_000);

const WORKBOOK = 'star_results_metadata';
const FILL = 'FF6A1B9A';
const OTHER_FILL = 'FF00897B';

const EXPORT_LABELS = [
  'Innovation use level',
  'Use level justification',
  'Linked innovation development',
  'Actors',
  'Organizations',
  'Quantifications',
];

const DROPPED_LABELS = [
  'Linked innovation readiness level',
  'Linked innovation description',
  'Linked innovation geographic scope',
];

const FALLBACK_GROUPS: ReadonlyArray<{
  sortOrder: number;
  fromCol: number;
  toCol: number;
  label: string;
  fillArgb: string;
}> = [
  {
    sortOrder: 1,
    fromCol: 1,
    toCol: 14,
    label: 'GENERAL INFORMATION',
    fillArgb: 'FF203C61',
  },
  {
    sortOrder: 2,
    fromCol: 15,
    toCol: 22,
    label: 'ALLIANCE ALIGNMENT',
    fillArgb: 'FF2A4783',
  },
  {
    sortOrder: 3,
    fromCol: 23,
    toCol: 23,
    label: 'PARTNERS',
    fillArgb: 'FF325B94',
  },
  {
    sortOrder: 4,
    fromCol: 24,
    toCol: 27,
    label: 'GEOGRAPHIC SCOPE',
    fillArgb: 'FF5A91D3',
  },
  {
    sortOrder: 5,
    fromCol: 28,
    toCol: 29,
    label: 'EVIDENCES',
    fillArgb: 'FF64B1DD',
  },
  {
    sortOrder: 6,
    fromCol: 30,
    toCol: 30,
    label: 'LINK TO RESULT',
    fillArgb: 'FF7E57C2',
  },
  {
    sortOrder: 7,
    fromCol: 31,
    toCol: 35,
    label: 'IP RIGHTS',
    fillArgb: 'FF35749A',
  },
  {
    sortOrder: 8,
    fromCol: 36,
    toCol: 56,
    label: 'CAPSHARING DETAILS',
    fillArgb: 'FF4D7C31',
  },
  {
    sortOrder: 9,
    fromCol: 57,
    toCol: 60,
    label: 'POLICY DETAILS',
    fillArgb: 'FFDA7842',
  },
  {
    sortOrder: 10,
    fromCol: 61,
    toCol: 74,
    label: 'OICR DETAILS',
    fillArgb: 'FFD9A041',
  },
];

const SEEDED_DICTIONARY: ReadonlyArray<{
  section: string | null;
  fieldLabel: string;
  explanation: string;
  sortOrder: number;
  fillArgb: string;
}> = [
  {
    section: 'General Information',
    fieldLabel: 'Result Code',
    explanation: 'Seeded result code',
    sortOrder: 1,
    fillArgb: 'FF203C61',
  },
  {
    section: null,
    fieldLabel: 'Actors',
    explanation: 'Seeded actors from another section',
    sortOrder: 63,
    fillArgb: OTHER_FILL,
  },
  {
    section: null,
    fieldLabel: 'Organizations',
    explanation: 'Seeded organizations from another section',
    sortOrder: 64,
    fillArgb: OTHER_FILL,
  },
  {
    section: 'Policy Change',
    fieldLabel: 'Linked innovation readiness level',
    explanation: 'Seeded same label, other section, other fill',
    sortOrder: 70,
    fillArgb: OTHER_FILL,
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

function isInnovationUseDictionary(row: PlainRow): boolean {
  return row.section_fill_argb === FILL;
}

function isDroppedDictionary(row: PlainRow): boolean {
  return (
    isInnovationUseDictionary(row) &&
    DROPPED_LABELS.includes(String(row.field_label))
  );
}

function withoutDictionaryId(row: PlainRow): PlainRow {
  const copy = { ...row };
  delete copy.report_data_dictionary_id;
  return copy;
}

async function emptyLayout(qr: QueryRunner): Promise<void> {
  await qr.query(
    `DELETE FROM report_workbook_column_group WHERE workbook_key = ?`,
    [WORKBOOK],
  );
  await qr.query(`DELETE FROM report_data_dictionary WHERE workbook_key = ?`, [
    WORKBOOK,
  ]);
}

async function seedRepresentative(qr: QueryRunner): Promise<void> {
  for (const group of FALLBACK_GROUPS) {
    await qr.query(
      `
      INSERT INTO report_workbook_column_group
        (workbook_key, sheet_key, sort_order, from_col, to_col, label, fill_argb, is_active)
      VALUES (?, 'raw_data', ?, ?, ?, ?, ?, 1)
      `,
      [
        WORKBOOK,
        group.sortOrder,
        group.fromCol,
        group.toCol,
        group.label,
        group.fillArgb,
      ],
    );
  }
  for (const row of SEEDED_DICTIONARY) {
    await qr.query(
      `
      INSERT INTO report_data_dictionary
        (workbook_key, section, field_label, explanation, sort_order, is_active, section_fill_argb)
      VALUES (?, ?, ?, ?, ?, 1, ?)
      `,
      [
        WORKBOOK,
        row.section,
        row.fieldLabel,
        row.explanation,
        row.sortOrder,
        row.fillArgb,
      ],
    );
  }
}

function innovationUseBase(dictionary: PlainRow[]): number {
  const orders = dictionary
    .filter(isInnovationUseDictionary)
    .map((row) => Number(row.sort_order));
  return Math.min(...orders);
}

function assertExportSubset(
  now: { groups: PlainRow[]; dictionary: PlainRow[] },
  postLayout: { groups: PlainRow[]; dictionary: PlainRow[] },
  base: number,
): void {
  const iuGroups = now.groups.filter((row) => row.label === 'INNOVATION USE');
  expect(iuGroups).toHaveLength(1);
  expect(iuGroups[0]).toMatchObject({
    from_col: 75,
    to_col: 80,
    label: 'INNOVATION USE',
    fill_argb: FILL,
  });
  expect(now.groups.filter((row) => row.label !== 'INNOVATION USE')).toEqual(
    postLayout.groups.filter((row) => row.label !== 'INNOVATION USE'),
  );

  const iuRows = now.dictionary
    .filter(isInnovationUseDictionary)
    .slice()
    .sort((a, b) => Number(a.sort_order) - Number(b.sort_order));
  expect(iuRows.map((row) => row.field_label)).toEqual(EXPORT_LABELS);
  expect(iuRows.map((row) => Number(row.sort_order))).toEqual(
    EXPORT_LABELS.map((_, index) => base + index),
  );
  expect(iuRows[0].section).toBe('Innovation Use');
  expect(iuRows.slice(1).every((row) => row.section === null)).toBe(true);
  expect(iuRows.map((row) => row.field_label)).toEqual(
    expect.not.arrayContaining(DROPPED_LABELS),
  );

  const beforeByLabel = new Map(
    postLayout.dictionary
      .filter(isInnovationUseDictionary)
      .map((row) => [row.field_label, row]),
  );
  for (const row of iuRows) {
    const before = beforeByLabel.get(row.field_label);
    expect(before).toBeDefined();
    expect(row.report_data_dictionary_id).toBe(
      before?.report_data_dictionary_id,
    );
    expect(row.explanation).toBe(before?.explanation);
  }

  expect(
    now.dictionary.filter((row) => !isInnovationUseDictionary(row)),
  ).toEqual(
    postLayout.dictionary.filter((row) => !isInnovationUseDictionary(row)),
  );
}

describe('StarRawInnovationUseExportSubset round trip (T-06)', () => {
  const layout = new StarRawInnovationUseColumnGroup1791400000000();
  const subset = new StarRawInnovationUseExportSubset1791500000000();

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

  it('up then down then up keeps a non-zero base and leaves other rows byte-identical', async () => {
    await inTransaction(async (qr) => {
      await emptyLayout(qr);
      await seedRepresentative(qr);
      await layout.up(qr);
      const postLayout = await snapshot(qr);
      const base = innovationUseBase(postLayout.dictionary);
      expect(base).toBeGreaterThan(1);
      expect(
        postLayout.dictionary.filter(isInnovationUseDictionary),
      ).toHaveLength(9);
      expect(postLayout.groups).toHaveLength(FALLBACK_GROUPS.length + 1);

      await subset.up(qr);
      const afterUp = await snapshot(qr);
      assertExportSubset(afterUp, postLayout, base);

      await subset.down(qr);
      const afterDown = await snapshot(qr);
      expect(afterDown.groups).toEqual(postLayout.groups);
      expect(
        afterDown.dictionary.filter((row) => !isDroppedDictionary(row)),
      ).toEqual(
        postLayout.dictionary.filter((row) => !isDroppedDictionary(row)),
      );
      const restored = afterDown.dictionary
        .filter(isDroppedDictionary)
        .map(withoutDictionaryId)
        .sort((a, b) =>
          String(a.field_label).localeCompare(String(b.field_label)),
        );
      const original = postLayout.dictionary
        .filter(isDroppedDictionary)
        .map(withoutDictionaryId)
        .sort((a, b) =>
          String(a.field_label).localeCompare(String(b.field_label)),
        );
      expect(restored).toEqual(original);
      expect(restored).toHaveLength(DROPPED_LABELS.length);

      await subset.up(qr);
      const afterSecondUp = await snapshot(qr);
      assertExportSubset(afterSecondUp, postLayout, base);
    });
  });
});
