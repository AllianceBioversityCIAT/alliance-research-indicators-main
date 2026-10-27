import type { QueryRunner } from 'typeorm';
import { dataSource } from '../../../src/db/config/mysql/orm.test.config';
import { StarRawInnovationUseColumnGroup1791400000000 } from '../../../src/db/migrations/1791400000000-StarRawInnovationUseColumnGroup';

/**
 * T-03 (docs/specs/innovation-use/excel-export) — layout migration round
 * trip on scratch. Seeds the fallback column groups from
 * star-results-metadata.sheet-presentation.ts because the Dev read of
 * report_workbook_column_group timed out (P-11 / P-16 UNVERIFIED, handed
 * to T-05). Also seeds dictionary rows whose field labels collide with
 * the new section (Actors, Organizations) so a down() keyed only by
 * field label cannot pass.
 *
 * No result_official_code band (FP-45). This file does not insert into
 * results.
 *
 * What this file cannot reach (KZ-017): Dev's real layout rows, and any
 * workbook other than star_results_metadata. The transaction is rolled
 * back, so a green run does not leave rows for migration:test:execute.
 */

jest.setTimeout(60_000);

const WORKBOOK = 'star_results_metadata';
const FILL = 'FF6A1B9A';

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
  explanation: string | null;
  sortOrder: number;
  fillArgb: string;
}> = [
  {
    section: 'General Information',
    fieldLabel: 'Result Code',
    explanation: null,
    sortOrder: 1,
    fillArgb: 'FF203C61',
  },
  {
    section: null,
    fieldLabel: 'Actors',
    explanation: null,
    sortOrder: 63,
    fillArgb: 'FF00897B',
  },
  {
    section: null,
    fieldLabel: 'Organizations',
    explanation: null,
    sortOrder: 64,
    fillArgb: 'FF00897B',
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

describe('StarRawInnovationUseColumnGroup round trip (T-03)', () => {
  const migration = new StarRawInnovationUseColumnGroup1791400000000();

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

  it('round-trips on an empty layout and lands columns 75-83', async () => {
    await inTransaction(async (qr) => {
      await emptyLayout(qr);

      await migration.up(qr);
      const inserted = await snapshot(qr);
      expect(inserted.groups).toHaveLength(1);
      expect(inserted.groups[0]).toMatchObject({
        workbook_key: WORKBOOK,
        sheet_key: 'raw_data',
        sort_order: 1,
        from_col: 75,
        to_col: 83,
        label: 'INNOVATION USE',
        fill_argb: FILL,
        is_active: 1,
      });
      expect(inserted.dictionary).toHaveLength(9);
      expect(inserted.dictionary.map((row) => row.field_label)).toEqual([
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
      expect(inserted.dictionary[0].section).toBe('Innovation Use');
      expect(
        inserted.dictionary.slice(1).every((row) => row.section === null),
      ).toBe(true);
      expect(
        inserted.dictionary.every((row) => row.section_fill_argb === FILL),
      ).toBe(true);
      expect(inserted.dictionary.map((row) => row.sort_order)).toEqual([
        1, 2, 3, 4, 5, 6, 7, 8, 9,
      ]);

      await migration.down(qr);
      const cleared = await snapshot(qr);
      expect(cleared.groups).toHaveLength(0);
      expect(cleared.dictionary).toHaveLength(0);

      await migration.up(qr);
      const again = await snapshot(qr);
      expect(again.groups).toHaveLength(1);
      expect(again.dictionary).toHaveLength(9);
      expect(again.groups[0]).toMatchObject({
        from_col: 75,
        to_col: 83,
        label: 'INNOVATION USE',
        fill_argb: FILL,
      });
    });
  });

  it('up then down then up leaves seeded rows byte-identical after down', async () => {
    await inTransaction(async (qr) => {
      await emptyLayout(qr);
      await seedRepresentative(qr);
      const before = await snapshot(qr);
      expect(before.groups).toHaveLength(FALLBACK_GROUPS.length);
      expect(before.dictionary).toHaveLength(SEEDED_DICTIONARY.length);

      await migration.up(qr);
      await migration.down(qr);
      const afterDown = await snapshot(qr);
      expect(afterDown.groups).toHaveLength(before.groups.length);
      expect(afterDown.dictionary).toHaveLength(before.dictionary.length);
      expect(afterDown.groups).toEqual(before.groups);
      expect(afterDown.dictionary).toEqual(before.dictionary);

      await migration.up(qr);
      const afterSecondUp = await snapshot(qr);
      expect(afterSecondUp.groups).toHaveLength(before.groups.length + 1);
      expect(afterSecondUp.dictionary).toHaveLength(
        before.dictionary.length + 9,
      );
      const seededGroupIds = new Set(
        before.groups.map((row) => row.report_workbook_column_group_id),
      );
      const survivingGroups = afterSecondUp.groups.filter((row) =>
        seededGroupIds.has(row.report_workbook_column_group_id),
      );
      expect(survivingGroups).toEqual(before.groups);
    });
  });
});
