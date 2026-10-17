import { STAR_RESULTS_METADATA_RAW_COLUMNS } from './star-results-metadata.columns';
import { STAR_RESULTS_METADATA_DICTIONARY_ROWS } from './star-results-metadata.dictionary';
import type { StarRawSectionKey } from './star-results-metadata.sections';

/** Dictionary label of the first row of each band whose labels match the Raw data headers. */
const ALIGNED_BANDS: ReadonlyArray<[StarRawSectionKey, string]> = [
  ['INNOVATION_USE', 'Innovation Use'],
  ['INNOVATION_DEVELOPMENT', 'Innovation Development'],
];

function dictionaryBand(section: string): string[] {
  const start = STAR_RESULTS_METADATA_DICTIONARY_ROWS.findIndex(
    (row) => row.section === section,
  );
  expect(start).toBeGreaterThan(-1);
  const labels: string[] = [];
  for (
    let i = start;
    i < STAR_RESULTS_METADATA_DICTIONARY_ROWS.length &&
    (i === start || !STAR_RESULTS_METADATA_DICTIONARY_ROWS[i].section);
    i++
  ) {
    labels.push(STAR_RESULTS_METADATA_DICTIONARY_ROWS[i].field_label);
  }
  return labels;
}

describe('STAR_RESULTS_METADATA_DICTIONARY_ROWS', () => {
  it.each(ALIGNED_BANDS)(
    'lists the %s Raw data headers in column order, one row each',
    (rawSection, dictionarySection) => {
      const headers = STAR_RESULTS_METADATA_RAW_COLUMNS.filter(
        (column) => column.section === rawSection,
      ).map((column) => column.header);
      expect(dictionaryBand(dictionarySection)).toEqual(headers);
    },
  );

  it('does not describe the result-level sex and age column', () => {
    expect(
      STAR_RESULTS_METADATA_DICTIONARY_ROWS.map((row) => row.field_label),
    ).not.toContain('Sex and age disaggregation not applicable');
  });

  it('gives every field row an explanation', () => {
    const missing = STAR_RESULTS_METADATA_DICTIONARY_ROWS.filter(
      (row) => !row.explanation?.trim(),
    ).map((row) => row.field_label);
    expect(missing).toEqual([]);
  });
});
