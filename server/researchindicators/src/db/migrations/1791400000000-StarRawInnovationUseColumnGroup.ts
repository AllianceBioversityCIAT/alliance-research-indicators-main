import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Appends the INNOVATION USE raw-data group (columns 75-83) and nine
 * data-dictionary rows. Existing groups and dictionary rows are not updated.
 *
 * Actors and Organizations already exist as dictionary field labels on an
 * earlier section, so down() matches the new fill as well as the field label.
 *
 * sort_order is COALESCE(MAX(sort_order), 0) + k inside the INSERT, scoped
 * by workbook_key (and sheet_key for the group). It is never a literal.
 *
 * @akili-spec docs/specs/innovation-use/excel-export
 */
export class StarRawInnovationUseColumnGroup1791400000000
  implements MigrationInterface
{
  private static readonly FILL_ARGB = 'FF6A1B9A';

  private static readonly WORKBOOK_KEY = 'star_results_metadata';

  private static readonly SHEET_KEY = 'raw_data';

  private static readonly GROUP_LABEL = 'INNOVATION USE';

  private static readonly SECTION = 'Innovation Use';

  private static readonly FROM_COL = 75;

  private static readonly TO_COL = 83;

  private static readonly DICTIONARY_ROWS: ReadonlyArray<{
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

  public async up(queryRunner: QueryRunner): Promise<void> {
    const fill = StarRawInnovationUseColumnGroup1791400000000.FILL_ARGB;
    const workbook = StarRawInnovationUseColumnGroup1791400000000.WORKBOOK_KEY;
    const sheet = StarRawInnovationUseColumnGroup1791400000000.SHEET_KEY;

    await queryRunner.query(
      `
      INSERT INTO \`report_workbook_column_group\`
        (\`workbook_key\`, \`sheet_key\`, \`sort_order\`, \`from_col\`, \`to_col\`, \`label\`, \`fill_argb\`, \`is_active\`)
      SELECT
        ?,
        ?,
        COALESCE(base.max_sort, 0) + ?,
        ?,
        ?,
        ?,
        ?,
        ?
      FROM (
        SELECT inner_base.max_sort AS max_sort
        FROM (
          SELECT MAX(\`sort_order\`) AS max_sort
          FROM \`report_workbook_column_group\`
          WHERE \`workbook_key\` = ?
            AND \`sheet_key\` = ?
        ) inner_base
      ) base
      `,
      [
        workbook,
        sheet,
        1,
        StarRawInnovationUseColumnGroup1791400000000.FROM_COL,
        StarRawInnovationUseColumnGroup1791400000000.TO_COL,
        StarRawInnovationUseColumnGroup1791400000000.GROUP_LABEL,
        fill,
        1,
        workbook,
        sheet,
      ],
    );

    const dictionaryRows =
      StarRawInnovationUseColumnGroup1791400000000.DICTIONARY_ROWS;
    const rowSelects = dictionaryRows
      .map(
        () =>
          'SELECT ? AS row_offset, ? AS section_name, ? AS field_label, ? AS explanation',
      )
      .join(' UNION ALL ');
    const rowParams = dictionaryRows.flatMap((row, index) => [
      index + 1,
      row.section,
      row.fieldLabel,
      row.explanation,
    ]);

    await queryRunner.query(
      `
      INSERT INTO \`report_data_dictionary\`
        (\`workbook_key\`, \`section\`, \`field_label\`, \`explanation\`, \`sort_order\`, \`is_active\`, \`section_fill_argb\`)
      SELECT
        ?,
        dict_row.section_name,
        dict_row.field_label,
        dict_row.explanation,
        COALESCE(base.max_sort, 0) + dict_row.row_offset,
        1,
        ?
      FROM (
        SELECT inner_base.max_sort AS max_sort
        FROM (
          SELECT MAX(\`sort_order\`) AS max_sort
          FROM \`report_data_dictionary\`
          WHERE \`workbook_key\` = ?
        ) inner_base
      ) base
      CROSS JOIN (
        ${rowSelects}
      ) dict_row
      `,
      [workbook, fill, workbook, ...rowParams],
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const fill = StarRawInnovationUseColumnGroup1791400000000.FILL_ARGB;
    const workbook = StarRawInnovationUseColumnGroup1791400000000.WORKBOOK_KEY;
    const labels =
      StarRawInnovationUseColumnGroup1791400000000.DICTIONARY_ROWS.map(
        (row) => row.fieldLabel,
      );
    const labelPlaceholders = labels.map(() => '?').join(', ');

    await queryRunner.query(
      `
      DELETE FROM \`report_workbook_column_group\`
      WHERE \`workbook_key\` = ?
        AND \`sheet_key\` = ?
        AND \`label\` = ?
        AND \`from_col\` = ?
        AND \`to_col\` = ?
      `,
      [
        workbook,
        StarRawInnovationUseColumnGroup1791400000000.SHEET_KEY,
        StarRawInnovationUseColumnGroup1791400000000.GROUP_LABEL,
        StarRawInnovationUseColumnGroup1791400000000.FROM_COL,
        StarRawInnovationUseColumnGroup1791400000000.TO_COL,
      ],
    );

    await queryRunner.query(
      `
      DELETE FROM \`report_data_dictionary\`
      WHERE \`workbook_key\` = ?
        AND \`section_fill_argb\` = ?
        AND \`field_label\` IN (${labelPlaceholders})
        AND (
          \`section\` = ?
          OR \`section\` IS NULL
        )
      `,
      [
        workbook,
        fill,
        ...labels,
        StarRawInnovationUseColumnGroup1791400000000.SECTION,
      ],
    );
  }
}
