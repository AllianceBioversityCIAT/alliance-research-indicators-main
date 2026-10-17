import { InternalServerErrorException } from '@nestjs/common';
import { deriveColumnGroups } from './excel-workbook.column-groups';
import { STAR_RESULTS_METADATA_RAW_COLUMNS } from '../handlers/star-results-metadata/star-results-metadata.columns';
import { STAR_RAW_SECTIONS } from '../handlers/star-results-metadata/star-results-metadata.sections';

/** Colours and titles typed from requirements §1, used as the catalog input. */
const CATALOG = {
  GENERAL_INFORMATION: {
    label: 'GENERAL INFORMATION',
    fillArgb: 'FF203C61',
  },
  ALLIANCE_ALIGNMENT: {
    label: 'ALLIANCE ALIGNMENT',
    fillArgb: 'FF2A4783',
  },
  PARTNERS: { label: 'PARTNERS', fillArgb: 'FF325B94' },
  GEOGRAPHIC_SCOPE: { label: 'GEOGRAPHIC SCOPE', fillArgb: 'FF5A91D3' },
  EVIDENCES: { label: 'EVIDENCES', fillArgb: 'FF64B1DD' },
  IP_RIGHTS: { label: 'IP RIGHTS', fillArgb: 'FF35749A' },
  OICR_DETAILS: { label: 'OICR DETAILS', fillArgb: 'FFD9A041' },
  INNOVATION_USE: { label: 'INNOVATION USE', fillArgb: 'FF6A1B9A' },
} as const;

type SyntheticSection = keyof typeof CATALOG;

function col(
  key: string,
  section: SyntheticSection,
): { key: string; section: SyntheticSection } {
  return { key, section };
}

describe('deriveColumnGroups (synthetic arrays)', () => {
  it('turns contiguous runs into one band each', () => {
    const result = deriveColumnGroups(
      [
        col('result_code', 'GENERAL_INFORMATION'),
        col('platform_code', 'GENERAL_INFORMATION'),
        col('primary_project', 'ALLIANCE_ALIGNMENT'),
        col('primary_lever', 'ALLIANCE_ALIGNMENT'),
        col('evidences', 'EVIDENCES'),
      ],
      CATALOG,
    );

    expect(result.columnGroups).toEqual([
      {
        fromCol: 1,
        toCol: 2,
        label: 'GENERAL INFORMATION',
        fillArgb: 'FF203C61',
      },
      {
        fromCol: 3,
        toCol: 4,
        label: 'ALLIANCE ALIGNMENT',
        fillArgb: 'FF2A4783',
      },
      { fromCol: 5, toCol: 5, label: 'EVIDENCES', fillArgb: 'FF64B1DD' },
    ]);
    expect(result.lastColumn).toBe(5);
  });

  it('gives a one-column section fromCol equal to toCol', () => {
    const result = deriveColumnGroups([col('partners', 'PARTNERS')], CATALOG);

    expect(result.columnGroups).toEqual([
      { fromCol: 1, toCol: 1, label: 'PARTNERS', fillArgb: 'FF325B94' },
    ]);
  });

  it('emits no band for a catalog section that no column uses', () => {
    const result = deriveColumnGroups(
      [col('result_code', 'GENERAL_INFORMATION')],
      CATALOG,
    );

    expect(result.columnGroups).toEqual([
      {
        fromCol: 1,
        toCol: 1,
        label: 'GENERAL INFORMATION',
        fillArgb: 'FF203C61',
      },
    ]);
    expect(result.columnGroups.map((band) => band.label)).not.toContain(
      'EVIDENCES',
    );
  });

  it('throws on a split section, naming the section, the stray column and the reopening column', () => {
    const columns = [
      col('partners', 'PARTNERS'),
      col('geo_scope_name', 'GEOGRAPHIC_SCOPE'),
      col('partners_again', 'PARTNERS'),
    ];

    expect(() => deriveColumnGroups(columns, CATALOG)).toThrow(
      InternalServerErrorException,
    );
    expect(() => deriveColumnGroups(columns, CATALOG)).toThrow(
      'Split section PARTNERS: stray column geo_scope_name at position 2; reopened by partners_again at position 3',
    );
  });

  it('grows the section a column is inserted into and shifts every later band by one', () => {
    const before = deriveColumnGroups(
      [
        col('who_owns_ip_rights', 'IP_RIGHTS'),
        col('third_party', 'IP_RIGHTS'),
        col('oicr_internal_code', 'OICR_DETAILS'),
        col('tagging', 'OICR_DETAILS'),
      ],
      CATALOG,
    );
    const after = deriveColumnGroups(
      [
        col('who_owns_ip_rights', 'IP_RIGHTS'),
        col('third_party', 'IP_RIGHTS'),
        col('asset_need_refinement', 'IP_RIGHTS'),
        col('oicr_internal_code', 'OICR_DETAILS'),
        col('tagging', 'OICR_DETAILS'),
      ],
      CATALOG,
    );

    expect(before.columnGroups).toEqual([
      { fromCol: 1, toCol: 2, label: 'IP RIGHTS', fillArgb: 'FF35749A' },
      { fromCol: 3, toCol: 4, label: 'OICR DETAILS', fillArgb: 'FFD9A041' },
    ]);
    expect(before.lastColumn).toBe(4);
    expect(after.columnGroups).toEqual([
      { fromCol: 1, toCol: 3, label: 'IP RIGHTS', fillArgb: 'FF35749A' },
      { fromCol: 4, toCol: 5, label: 'OICR DETAILS', fillArgb: 'FFD9A041' },
    ]);
    expect(after.lastColumn).toBe(5);
  });

  it('appends one new band and leaves every earlier band identical', () => {
    const before = deriveColumnGroups(
      [
        col('result_code', 'GENERAL_INFORMATION'),
        col('platform_code', 'GENERAL_INFORMATION'),
      ],
      CATALOG,
    );
    const after = deriveColumnGroups(
      [
        col('result_code', 'GENERAL_INFORMATION'),
        col('platform_code', 'GENERAL_INFORMATION'),
        col('innovation_use_level', 'INNOVATION_USE'),
        col('innovation_use_quantifications', 'INNOVATION_USE'),
      ],
      CATALOG,
    );

    expect(before.columnGroups).toEqual([
      {
        fromCol: 1,
        toCol: 2,
        label: 'GENERAL INFORMATION',
        fillArgb: 'FF203C61',
      },
    ]);
    expect(after.columnGroups).toEqual([
      {
        fromCol: 1,
        toCol: 2,
        label: 'GENERAL INFORMATION',
        fillArgb: 'FF203C61',
      },
      {
        fromCol: 3,
        toCol: 4,
        label: 'INNOVATION USE',
        fillArgb: 'FF6A1B9A',
      },
    ]);
    expect(after.columnGroups[0]).toEqual(before.columnGroups[0]);
  });

  it('reports last column 81 when the array has 81 columns', () => {
    const columns = Array.from({ length: 81 }, (_, index) =>
      col(`c${index + 1}`, 'GENERAL_INFORMATION'),
    );

    const result = deriveColumnGroups(columns, CATALOG);

    expect(result.lastColumn).toBe(81);
    expect(result.columnGroups).toEqual([
      {
        fromCol: 1,
        toCol: 81,
        label: 'GENERAL INFORMATION',
        fillArgb: 'FF203C61',
      },
    ]);
  });
});

describe('deriveColumnGroups over the real raw array', () => {
  it('matches the intended layout exactly and ends at column 111', () => {
    const result = deriveColumnGroups(
      STAR_RESULTS_METADATA_RAW_COLUMNS,
      STAR_RAW_SECTIONS,
    );

    expect(result.columnGroups).toEqual([
      {
        fromCol: 1,
        toCol: 14,
        label: 'GENERAL INFORMATION',
        fillArgb: 'FF203C61',
      },
      {
        fromCol: 15,
        toCol: 22,
        label: 'ALLIANCE ALIGNMENT',
        fillArgb: 'FF2A4783',
      },
      { fromCol: 23, toCol: 23, label: 'PARTNERS', fillArgb: 'FF325B94' },
      {
        fromCol: 24,
        toCol: 27,
        label: 'GEOGRAPHIC SCOPE',
        fillArgb: 'FF5A91D3',
      },
      { fromCol: 28, toCol: 29, label: 'EVIDENCES', fillArgb: 'FF64B1DD' },
      { fromCol: 30, toCol: 30, label: 'LINK TO RESULT', fillArgb: 'FF7E57C2' },
      { fromCol: 31, toCol: 35, label: 'IP RIGHTS', fillArgb: 'FF35749A' },
      {
        fromCol: 36,
        toCol: 56,
        label: 'CAPSHARING DETAILS',
        fillArgb: 'FF4D7C31',
      },
      { fromCol: 57, toCol: 60, label: 'POLICY DETAILS', fillArgb: 'FFDA7842' },
      { fromCol: 61, toCol: 74, label: 'OICR DETAILS', fillArgb: 'FFD9A041' },
      {
        fromCol: 75,
        toCol: 80,
        label: 'INNOVATION USE',
        fillArgb: 'FF6A1B9A',
      },
      {
        fromCol: 81,
        toCol: 111,
        label: 'INNOVATION DEVELOPMENT',
        fillArgb: 'FF00897B',
      },
    ]);
    expect(result.lastColumn).toBe(111);
  });
});
