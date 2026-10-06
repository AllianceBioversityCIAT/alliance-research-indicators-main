import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Narrows the INNOVATION USE export from the nine dictionary rows and
 * group span inserted by 1791400000000 to the six exported columns
 * (75-80). The view stays at nine columns. Existing groups and every
 * dictionary row outside this fill and these labels are not updated.
 *
 * sort_order is MIN(sort_order) of the Innovation Use rows plus a bound
 * offset. It is never a literal.
 *
 * @akili-spec docs/specs/innovation-use/excel-export
 */
export class StarRawInnovationUseExportSubset1791500000000
  implements MigrationInterface
{
  private static readonly FILL_ARGB = 'FF6A1B9A';

  private static readonly WORKBOOK_KEY = 'star_results_metadata';

  private static readonly SHEET_KEY = 'raw_data';

  private static readonly GROUP_LABEL = 'INNOVATION USE';

  private static readonly FROM_COL = 75;

  private static readonly WIDE_TO_COL = 83;

  private static readonly EXPORT_TO_COL = 80;

  /** R-IUX-002…006 order, the nine rows 1791400000000 inserted. */
  private static readonly ALL_LABELS = [
    'Innovation use level',
    'Use level justification',
    'Actors',
    'Organizations',
    'Quantifications',
    'Linked innovation development',
    'Linked innovation readiness level',
    'Linked innovation description',
    'Linked innovation geographic scope',
  ] as const;

  /** §3.2a export order. Offset is added to MIN(sort_order) in SQL. */
  private static readonly EXPORT_ASSIGNMENTS: ReadonlyArray<{
    fieldLabel: string;
    offset: number;
  }> = [
    { fieldLabel: 'Innovation use level', offset: 0 },
    { fieldLabel: 'Use level justification', offset: 1 },
    { fieldLabel: 'Linked innovation development', offset: 2 },
    { fieldLabel: 'Actors', offset: 3 },
    { fieldLabel: 'Organizations', offset: 4 },
    { fieldLabel: 'Quantifications', offset: 5 },
  ];

  /** Original order of the six rows that stay, base+0 … base+5. */
  private static readonly ORIGINAL_ASSIGNMENTS: ReadonlyArray<{
    fieldLabel: string;
    offset: number;
  }> = [
    { fieldLabel: 'Innovation use level', offset: 0 },
    { fieldLabel: 'Use level justification', offset: 1 },
    { fieldLabel: 'Actors', offset: 2 },
    { fieldLabel: 'Organizations', offset: 3 },
    { fieldLabel: 'Quantifications', offset: 4 },
    { fieldLabel: 'Linked innovation development', offset: 5 },
  ];

  /**
   * The three view-only rows, copied from 1791400000000 DICTIONARY_ROWS
   * (section null, same explanations, same fill). Offsets are base+6…8.
   */
  private static readonly DROPPED_ROWS: ReadonlyArray<{
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

  public async up(queryRunner: QueryRunner): Promise<void> {
    await this.setGroupToCol(
      queryRunner,
      StarRawInnovationUseExportSubset1791500000000.EXPORT_TO_COL,
      StarRawInnovationUseExportSubset1791500000000.WIDE_TO_COL,
    );
    await this.reorder(
      queryRunner,
      StarRawInnovationUseExportSubset1791500000000.ALL_LABELS,
      StarRawInnovationUseExportSubset1791500000000.EXPORT_ASSIGNMENTS,
    );
    await this.deleteDropped(queryRunner);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const surviving =
      StarRawInnovationUseExportSubset1791500000000.EXPORT_ASSIGNMENTS.map(
        (row) => row.fieldLabel,
      );
    await this.reorder(
      queryRunner,
      surviving,
      StarRawInnovationUseExportSubset1791500000000.ORIGINAL_ASSIGNMENTS,
    );
    await this.reinsertDropped(queryRunner, surviving);
    await this.setGroupToCol(
      queryRunner,
      StarRawInnovationUseExportSubset1791500000000.WIDE_TO_COL,
      StarRawInnovationUseExportSubset1791500000000.EXPORT_TO_COL,
    );
  }

  private async setGroupToCol(
    queryRunner: QueryRunner,
    nextToCol: number,
    currentToCol: number,
  ): Promise<void> {
    await queryRunner.query(
      `
      UPDATE \`report_workbook_column_group\`
      SET \`to_col\` = ?
      WHERE \`workbook_key\` = ?
        AND \`sheet_key\` = ?
        AND \`label\` = ?
        AND \`from_col\` = ?
        AND \`to_col\` = ?
      `,
      [
        nextToCol,
        StarRawInnovationUseExportSubset1791500000000.WORKBOOK_KEY,
        StarRawInnovationUseExportSubset1791500000000.SHEET_KEY,
        StarRawInnovationUseExportSubset1791500000000.GROUP_LABEL,
        StarRawInnovationUseExportSubset1791500000000.FROM_COL,
        currentToCol,
      ],
    );
  }

  private async reorder(
    queryRunner: QueryRunner,
    minLabels: readonly string[],
    assignments: ReadonlyArray<{ fieldLabel: string; offset: number }>,
  ): Promise<void> {
    const minPlaceholders = minLabels.map(() => '?').join(', ');
    const caseArms = assignments
      .map(() => 'WHEN ? THEN ?')
      .join('\n          ');
    const assignPlaceholders = assignments.map(() => '?').join(', ');
    const fill = StarRawInnovationUseExportSubset1791500000000.FILL_ARGB;
    const workbook = StarRawInnovationUseExportSubset1791500000000.WORKBOOK_KEY;

    await queryRunner.query(
      `
      UPDATE \`report_data_dictionary\` AS target
      INNER JOIN (
        SELECT nested.base_sort AS base_sort
        FROM (
          SELECT MIN(\`sort_order\`) AS base_sort
          FROM \`report_data_dictionary\`
          WHERE \`workbook_key\` = ?
            AND \`section_fill_argb\` = ?
            AND \`field_label\` IN (${minPlaceholders})
        ) nested
      ) iu_base
      SET target.\`sort_order\` = iu_base.base_sort + CASE target.\`field_label\`
          ${caseArms}
          ELSE target.\`sort_order\`
        END
      WHERE target.\`workbook_key\` = ?
        AND target.\`section_fill_argb\` = ?
        AND target.\`field_label\` IN (${assignPlaceholders})
      `,
      [
        workbook,
        fill,
        ...minLabels,
        ...assignments.flatMap((row) => [row.fieldLabel, row.offset]),
        workbook,
        fill,
        ...assignments.map((row) => row.fieldLabel),
      ],
    );
  }

  private async deleteDropped(queryRunner: QueryRunner): Promise<void> {
    const labels =
      StarRawInnovationUseExportSubset1791500000000.DROPPED_ROWS.map(
        (row) => row.fieldLabel,
      );
    const placeholders = labels.map(() => '?').join(', ');
    await queryRunner.query(
      `
      DELETE FROM \`report_data_dictionary\`
      WHERE \`workbook_key\` = ?
        AND \`section_fill_argb\` = ?
        AND \`field_label\` IN (${placeholders})
      `,
      [
        StarRawInnovationUseExportSubset1791500000000.WORKBOOK_KEY,
        StarRawInnovationUseExportSubset1791500000000.FILL_ARGB,
        ...labels,
      ],
    );
  }

  private async reinsertDropped(
    queryRunner: QueryRunner,
    survivingLabels: readonly string[],
  ): Promise<void> {
    const dropped = StarRawInnovationUseExportSubset1791500000000.DROPPED_ROWS;
    const minPlaceholders = survivingLabels.map(() => '?').join(', ');
    const rowSelects = dropped
      .map(
        () =>
          'SELECT ? AS row_offset, ? AS section_name, ? AS field_label, ? AS explanation',
      )
      .join(' UNION ALL ');
    const fill = StarRawInnovationUseExportSubset1791500000000.FILL_ARGB;
    const workbook = StarRawInnovationUseExportSubset1791500000000.WORKBOOK_KEY;
    const rowParams = dropped.flatMap((row) => [
      row.offset,
      null,
      row.fieldLabel,
      row.explanation,
    ]);

    await queryRunner.query(
      `
      INSERT INTO \`report_data_dictionary\`
        (\`workbook_key\`, \`section\`, \`field_label\`, \`explanation\`, \`sort_order\`, \`is_active\`, \`section_fill_argb\`)
      SELECT
        ?,
        dropped.section_name,
        dropped.field_label,
        dropped.explanation,
        iu_base.base_sort + dropped.row_offset,
        1,
        ?
      FROM (
        SELECT nested.base_sort AS base_sort
        FROM (
          SELECT MIN(\`sort_order\`) AS base_sort
          FROM \`report_data_dictionary\`
          WHERE \`workbook_key\` = ?
            AND \`section_fill_argb\` = ?
            AND \`field_label\` IN (${minPlaceholders})
        ) nested
      ) iu_base
      CROSS JOIN (
        ${rowSelects}
      ) dropped
      `,
      [workbook, fill, workbook, fill, ...survivingLabels, ...rowParams],
    );
  }
}
