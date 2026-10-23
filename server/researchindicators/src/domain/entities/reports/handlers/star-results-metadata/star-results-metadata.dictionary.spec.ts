import { STAR_RESULTS_METADATA_RAW_COLUMNS } from './star-results-metadata.columns';
import { STAR_RESULTS_METADATA_DICTIONARY_ROWS } from './star-results-metadata.dictionary';

const [HEADER_ROW, ...FIELD_ROWS] = STAR_RESULTS_METADATA_DICTIONARY_ROWS;

describe('STAR_RESULTS_METADATA_DICTIONARY_ROWS', () => {
  it('starts with the Section / Field / Explanation header row', () => {
    expect(HEADER_ROW).toMatchObject({
      section: 'Section',
      field_label: 'Field',
      explanation: 'Explanation',
    });
  });

  it('has one row per Raw data column, labelled with its header, in column order', () => {
    expect(FIELD_ROWS.map((row) => row.field_label)).toEqual(
      STAR_RESULTS_METADATA_RAW_COLUMNS.map((column) => column.header),
    );
  });

  it('opens a dictionary section exactly where a Raw data section starts', () => {
    const rawStarts = STAR_RESULTS_METADATA_RAW_COLUMNS.map(
      (column, index, all) =>
        index === 0 || column.section !== all[index - 1].section,
    );
    const dictionaryStarts = FIELD_ROWS.map(
      (row) => Boolean(row.section) && Boolean(row.section_fill_argb),
    );
    expect(dictionaryStarts).toEqual(rawStarts);
  });

  it('does not describe the result-level sex and age column', () => {
    expect(FIELD_ROWS.map((row) => row.field_label)).not.toContain(
      'Sex and age disaggregation not applicable',
    );
  });

  it('gives every field row an explanation', () => {
    const missing = FIELD_ROWS.filter((row) => !row.explanation?.trim()).map(
      (row) => row.field_label,
    );
    expect(missing).toEqual([]);
  });
});
