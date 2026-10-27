import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Reuses the 27 Innovation details dictionary rows and inserts the 5
 * labels the seed does not have. The 32 rows move to the end of
 * star_results_metadata. Writes are keyed by id. No group row is written.
 *
 * The anchor is Link to Innovation Use. The block is the next 27
 * sort_order values. down() restores those rows relative to the anchor,
 * not to the seed file's original numbers.
 *
 * @akili-spec docs/specs/innovation-dev/excel-export
 */
type DictionarySlot = {
  k: number;
  label: string;
  explanation: string;
  seedLabel: string | null;
};

type DictionaryIdentity = {
  id: number;
  sort_order: number;
  field_label: string;
};

type DictionaryPresence = {
  anchor: number;
  details: number;
  development: number;
};

const WORKBOOK_KEY = 'star_results_metadata';
const SECTION = 'Innovation Development';
const PRIOR_SECTION = 'Innovation details';
const FILL = 'FF00897B';
const ANCHOR_LABEL = 'Link to Innovation Use';
const GUARD = 'Innovation Development dictionary guard';

const SLOTS: readonly DictionarySlot[] = [
  {
    k: 1,
    label: 'Short title',
    explanation:
      'The innovation short title. A blank title on an Innovation Development result reads Not provided. Any other indicator reads Not applicable.',
    seedLabel: 'Short title',
  },
  {
    k: 2,
    label: 'Innovation nature',
    explanation:
      'The innovation nature catalog name. A missing nature on an Innovation Development result reads Not provided.',
    seedLabel: 'Innovation nature',
  },
  {
    k: 3,
    label: 'Innovation type',
    explanation:
      'The innovation type catalog name. A missing type on an Innovation Development result reads Not provided.',
    seedLabel: 'Innovation type',
  },
  {
    k: 4,
    label: 'New or improved variety or breed',
    explanation:
      'Whether the innovation is a new or improved variety or breed, shown as Yes or No. Optional.',
    seedLabel: null,
  },
  {
    k: 5,
    label: 'Number of new or improved lines/varieties',
    explanation:
      'The number of new or improved lines or varieties. Required and greater than zero only when the variety answer is Yes; otherwise Not applicable.',
    seedLabel: null,
  },
  {
    k: 6,
    label: 'Innovation readiness level',
    explanation:
      'The innovation readiness level, shown as Level followed by the number and the level name. A missing level on an Innovation Development result reads Not provided.',
    seedLabel: 'Innovation readiness level',
  },
  {
    k: 7,
    label: 'Readiness explanation',
    explanation:
      'Free-text explanation of the chosen readiness level. Required on an Innovation Development result.',
    seedLabel: 'Readiness explanation ',
  },
  {
    k: 8,
    label: 'Anticipated users',
    explanation:
      'Who the innovation is anticipated to reach. Required on an Innovation Development result.',
    seedLabel: null,
  },
  {
    k: 9,
    label: 'Sex and age disaggregation not applicable',
    explanation:
      'Whether sex and age disaggregation does not apply, shown as Yes or No. Optional on an Innovation Development result.',
    seedLabel: null,
  },
  {
    k: 10,
    label: 'Actors',
    explanation:
      'One bullet line per actor, with the actor type, an optional custom name, and either sex and age segments or a not-applicable note. Required when anticipated users are determined.',
    seedLabel: 'Actors',
  },
  {
    k: 11,
    label: 'Organizations',
    explanation:
      'One bullet line per organization, either a known institution or a type with an optional sub-type and custom name. Required when anticipated users are determined.',
    seedLabel: 'Organizations',
  },
  {
    k: 12,
    label: 'Intended beneficiaries/users elaborated',
    explanation:
      'Free-text description of the intended beneficiaries or users. Required when anticipated users are determined.',
    seedLabel: 'Intended beneficiaries/users elaborated\n',
  },
  {
    k: 13,
    label: 'Expected outcomes',
    explanation:
      'Free-text description of the expected outcomes. Required when anticipated users are determined.',
    seedLabel: 'Expected outcomes ',
  },
  {
    k: 14,
    label: 'Potential for researchers/policymakers adaptation',
    explanation:
      'Whether the innovation has potential for adaptation by researchers or policymakers, shown as Yes or No. Required when the readiness level is 7 or higher.',
    seedLabel: 'Potential for researchers/policymakers adaptation',
  },
  {
    k: 15,
    label: 'Method/tool qualifies for dissemination',
    explanation:
      'The dissemination qualification. Required when knowledge sharing is Yes and the readiness level is 7 or higher.',
    seedLabel: 'Method/tool qualifies for dissemination\n',
  },
  {
    k: 16,
    label: 'Context for tool usefulness',
    explanation:
      'Free-text context for why the tool is useful. Required when dissemination proceeds.',
    seedLabel: 'Context for tool usefulness',
  },
  {
    k: 17,
    label: 'Results detailed with examples',
    explanation:
      'Free-text results with examples. Required when dissemination proceeds.',
    seedLabel: 'Results detailed with examples',
  },
  {
    k: 18,
    label: 'Tool function',
    explanation:
      'One bullet line per tool function. At least one is required when dissemination proceeds.',
    seedLabel: 'Tool function',
  },
  {
    k: 19,
    label: 'Innovation used beyond original context',
    explanation:
      'Whether the innovation was used beyond its original context, shown as Yes or No. Required when dissemination proceeds.',
    seedLabel: 'Innovation used beyond original context',
  },
  {
    k: 20,
    label: 'Adopted and adapted in other contexts',
    explanation:
      'Free-text description of adoption and adaptation in other contexts. Required when used beyond the original context is Yes.',
    seedLabel: 'Adopted and adapted in other contexts',
  },
  {
    k: 21,
    label: 'Tools often used together',
    explanation:
      'One bullet line per linked result often used with this tool. Optional.',
    seedLabel: 'Tools often used together',
  },
  {
    k: 22,
    label: 'Other tools',
    explanation: 'Free-text names of other tools. Optional.',
    seedLabel: 'Other tools',
  },
  {
    k: 23,
    label: "Other tools' usage with this one description",
    explanation:
      'Free-text description of how other tools are used with this one. Optional.',
    seedLabel: "Other tools' usage with this one description",
  },
  {
    k: 24,
    label: 'Formulation: Is it cheaper compared to alternatives?',
    explanation:
      'The 1 to 5 answer for whether the formulation is cheaper than alternatives. Optional, and shown only when the readiness level is 7 or higher.',
    seedLabel: 'Formulation:\nIs it cheaper compared to alternatives?',
  },
  {
    k: 25,
    label: 'Formulation: Is it simpler to use?',
    explanation:
      'The 1 to 5 answer for whether the formulation is simpler to use. Optional, and shown only when the readiness level is 7 or higher.',
    seedLabel: 'Formulation: Is it simpler to use?',
  },
  {
    k: 26,
    label: 'Formulation: Does it perform better?',
    explanation:
      'The 1 to 5 answer for whether the formulation performs better. Optional, and shown only when the readiness level is 7 or higher.',
    seedLabel: 'Formulation: Does it perform better?',
  },
  {
    k: 27,
    label:
      'Demand and Investment: Is the innovation desirable to intended users?',
    explanation:
      'The 1 to 5 answer for whether the innovation is desirable to intended users. Optional, and shown only when the readiness level is 7 or higher.',
    seedLabel:
      'Demand and Investment: \nIs the innovation desirable to intended\nusers?',
  },
  {
    k: 28,
    label:
      'Demand and Investment: Is the innovation commercially viable/is there investment potential?',
    explanation:
      'The 1 to 5 answer for commercial viability or investment potential. Optional, and shown only when the readiness level is 7 or higher.',
    seedLabel:
      'Demand and Investment: Is the innovation commercially viable/is there\ninvestment potential?',
  },
  {
    k: 29,
    label:
      'Sustained use: Is the innovation supported by a suitable enabling environment?',
    explanation:
      'The 1 to 5 answer for whether a suitable enabling environment supports the innovation. Optional, and shown only when the readiness level is 7 or higher.',
    seedLabel:
      'Sustained use: Is the innovation supported by a suitable enabling\nenvironment?',
  },
  {
    k: 30,
    label: 'Sustained use: Is there already evidence of uptake?',
    explanation:
      'The 1 to 5 answer for whether there is already evidence of uptake. Optional, and shown only when the readiness level is 7 or higher.',
    seedLabel: 'Sustained use: Is there already evidence of\nuptake? ',
  },
  {
    k: 31,
    label:
      'Sustained use: Is there potential for actor in new contexts and for new purposes?',
    explanation:
      'The expansion-potential catalog name. Optional, and shown only when the readiness level is 7 or higher.',
    seedLabel:
      'Sustained use: Is there potential for actor in new contexts and for new purposes? ',
  },
  {
    k: 32,
    label: 'Expansion and adaptation details',
    explanation:
      'Free-text expansion and adaptation details. Shown only when the readiness level is 7 or higher and expansion potential is Yes, with adaptations.',
    seedLabel: null,
  },
];

function normaliseSeedLabel(value: string): string {
  return value.replace(/\s*\n\s*/g, ' ').trim();
}

function sqlInt(value: number): string {
  if (!Number.isSafeInteger(value)) {
    throw new Error(`${GUARD}: refusing a non-integer interpolation.`);
  }
  return String(value);
}

function sqlValue(value: string | null): string {
  if (value === null) {
    return 'NULL';
  }
  return `'${value.replace(/\\/g, '\\\\').replace(/'/g, "''")}'`;
}

function seedSlots(): DictionarySlot[] {
  return SLOTS.filter((slot) => slot.seedLabel !== null);
}

function assertSlotShape(): void {
  if (SLOTS.length !== 32) {
    throw new Error(`${GUARD}: expected 32 dictionary slots.`);
  }
  SLOTS.forEach((slot, index) => {
    if (slot.k !== index + 1) {
      throw new Error(`${GUARD}: slot k is not contiguous.`);
    }
    if (
      slot.seedLabel !== null &&
      normaliseSeedLabel(slot.seedLabel) !== slot.label
    ) {
      throw new Error(
        `${GUARD}: slot ${slot.k} label does not match its seed label.`,
      );
    }
  });
  if (seedSlots().length !== 27) {
    throw new Error(`${GUARD}: expected 27 seed slots.`);
  }
}

function asRows(value: unknown): DictionaryIdentity[] {
  if (!Array.isArray(value)) {
    throw new Error(`${GUARD}: query did not return rows.`);
  }
  return value.map((row) => {
    const record = row as Record<string, unknown>;
    return {
      id: Number(record.id),
      sort_order: Number(record.sort_order),
      field_label: String(record.field_label),
    };
  });
}

export class StarRawInnovationDevDictionary1791800000000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    assertSlotShape();
    if (await this.skipIfNeverSeeded(queryRunner)) {
      return;
    }
    const anchor = await this.readAnchor(queryRunner);
    const block = await this.readRange(
      queryRunner,
      anchor.sort_order + 1,
      anchor.sort_order + seedSlots().length,
    );
    this.assertSeedBlock(block, anchor.sort_order);
    const base = await this.readMaxSort(queryRunner);
    const reused = seedSlots();
    for (let index = 0; index < reused.length; index += 1) {
      const slot = reused[index];
      await this.writeUpdate(queryRunner, block[index].id, {
        label: slot.label,
        explanation: slot.explanation,
        sortOrder: base + slot.k,
        section: slot.k === 1 ? SECTION : null,
        fill: slot.k === 1 ? FILL : null,
      });
    }
    for (const slot of SLOTS) {
      if (slot.seedLabel !== null) {
        continue;
      }
      await this.writeInsert(queryRunner, slot, base + slot.k);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    assertSlotShape();
    if (await this.skipIfNeverSeeded(queryRunner)) {
      return;
    }
    const start = await this.readSectionStart(queryRunner);
    const block = await this.readRange(
      queryRunner,
      start,
      start + SLOTS.length - 1,
    );
    this.assertFinalBlock(block, start);
    const anchor = await this.readAnchor(queryRunner);
    const insertIds: number[] = [];
    let seedPosition = 0;
    for (let index = 0; index < SLOTS.length; index += 1) {
      const slot = SLOTS[index];
      if (slot.seedLabel === null) {
        insertIds.push(block[index].id);
        continue;
      }
      seedPosition += 1;
      await this.writeUpdate(queryRunner, block[index].id, {
        label: slot.seedLabel,
        explanation: null,
        sortOrder: anchor.sort_order + seedPosition,
        section: seedPosition === 1 ? PRIOR_SECTION : null,
        fill: seedPosition === 1 ? FILL : null,
      });
    }
    await this.deleteIds(queryRunner, insertIds);
  }

  private assertSeedBlock(
    rows: DictionaryIdentity[],
    anchorSort: number,
  ): void {
    const expected = seedSlots();
    if (rows.length !== expected.length) {
      throw new Error(
        `${GUARD}: expected ${expected.length} rows after the anchor and found ${rows.length}.`,
      );
    }
    for (let index = 0; index < expected.length; index += 1) {
      const position = index + 1;
      const row = rows[index];
      if (row.field_label !== expected[index].seedLabel) {
        throw new Error(`${GUARD}: block position ${position} label mismatch.`);
      }
      if (row.sort_order !== anchorSort + position) {
        throw new Error(`${GUARD}: block position ${position} sort mismatch.`);
      }
    }
  }

  private assertFinalBlock(rows: DictionaryIdentity[], start: number): void {
    if (rows.length !== SLOTS.length) {
      throw new Error(
        `${GUARD}: expected ${SLOTS.length} Innovation Development rows and found ${rows.length}.`,
      );
    }
    for (let index = 0; index < SLOTS.length; index += 1) {
      const position = index + 1;
      const row = rows[index];
      if (row.field_label !== SLOTS[index].label) {
        throw new Error(`${GUARD}: block position ${position} label mismatch.`);
      }
      if (row.sort_order !== start + index) {
        throw new Error(`${GUARD}: block position ${position} sort mismatch.`);
      }
    }
  }

  /**
   * Schema-only scratch has none of the three markers. A partial
   * dictionary (anchor missing while seed or final rows exist) throws
   * before any write.
   */
  private async skipIfNeverSeeded(queryRunner: QueryRunner): Promise<boolean> {
    const presence = await this.readPresence(queryRunner);
    if (
      presence.anchor === 0 &&
      presence.details === 0 &&
      presence.development === 0
    ) {
      return true;
    }
    if (presence.anchor === 0) {
      throw new Error(
        `${GUARD}: anchor absent while seed or final rows exist.`,
      );
    }
    return false;
  }

  private async readPresence(
    queryRunner: QueryRunner,
  ): Promise<DictionaryPresence> {
    const rows = (await queryRunner.query(
      `
      SELECT
        SUM(CASE WHEN \`field_label\` = '${ANCHOR_LABEL}' THEN 1 ELSE 0 END) AS anchor_count,
        SUM(CASE WHEN \`section\` = '${PRIOR_SECTION}' THEN 1 ELSE 0 END) AS details_count,
        SUM(CASE WHEN \`section\` = '${SECTION}' THEN 1 ELSE 0 END) AS development_count
      FROM \`report_data_dictionary\`
      WHERE \`workbook_key\` = '${WORKBOOK_KEY}'
      `,
    )) as Array<Record<string, unknown>>;
    const row = rows[0] ?? {};
    return {
      anchor: this.countOrZero(row.anchor_count),
      details: this.countOrZero(row.details_count),
      development: this.countOrZero(row.development_count),
    };
  }

  private countOrZero(value: unknown): number {
    if (value === null || value === undefined) {
      return 0;
    }
    const count = Number(value);
    if (!Number.isSafeInteger(count) || count < 0) {
      throw new Error(`${GUARD}: presence count is not a whole number.`);
    }
    return count;
  }

  private async readAnchor(
    queryRunner: QueryRunner,
  ): Promise<DictionaryIdentity> {
    const rows = asRows(
      await queryRunner.query(
        `
        SELECT \`report_data_dictionary_id\` AS id,
               \`sort_order\` AS sort_order,
               \`field_label\` AS field_label
        FROM \`report_data_dictionary\`
        WHERE \`workbook_key\` = '${WORKBOOK_KEY}'
          AND \`field_label\` = '${ANCHOR_LABEL}'
        `,
      ),
    );
    if (rows.length !== 1 || rows[0].field_label !== ANCHOR_LABEL) {
      throw new Error(
        `${GUARD}: anchor ${ANCHOR_LABEL} matched ${rows.length} rows.`,
      );
    }
    return rows[0];
  }

  private async readSectionStart(queryRunner: QueryRunner): Promise<number> {
    const rows = asRows(
      await queryRunner.query(
        `
        SELECT \`report_data_dictionary_id\` AS id,
               \`sort_order\` AS sort_order,
               \`field_label\` AS field_label
        FROM \`report_data_dictionary\`
        WHERE \`workbook_key\` = '${WORKBOOK_KEY}'
          AND \`section\` = '${SECTION}'
        `,
      ),
    );
    if (rows.length !== 1) {
      throw new Error(
        `${GUARD}: ${SECTION} section matched ${rows.length} rows.`,
      );
    }
    return rows[0].sort_order;
  }

  private async readRange(
    queryRunner: QueryRunner,
    fromSort: number,
    toSort: number,
  ): Promise<DictionaryIdentity[]> {
    return asRows(
      await queryRunner.query(
        `
        SELECT \`report_data_dictionary_id\` AS id,
               \`sort_order\` AS sort_order,
               \`field_label\` AS field_label
        FROM \`report_data_dictionary\`
        WHERE \`workbook_key\` = '${WORKBOOK_KEY}'
          AND \`sort_order\` BETWEEN ${sqlInt(fromSort)} AND ${sqlInt(toSort)}
        ORDER BY \`sort_order\`, \`report_data_dictionary_id\`
        `,
      ),
    );
  }

  private async readMaxSort(queryRunner: QueryRunner): Promise<number> {
    const rows = (await queryRunner.query(
      `
      SELECT MAX(\`sort_order\`) AS max_sort
      FROM \`report_data_dictionary\`
      WHERE \`workbook_key\` = '${WORKBOOK_KEY}'
      `,
    )) as Array<{ max_sort: number | null }>;
    const maxSort = Number(rows[0]?.max_sort);
    if (!Number.isSafeInteger(maxSort)) {
      throw new Error(`${GUARD}: dictionary max sort_order is missing.`);
    }
    return maxSort;
  }

  private async writeUpdate(
    queryRunner: QueryRunner,
    id: number,
    fields: {
      label: string;
      explanation: string | null;
      sortOrder: number;
      section: string | null;
      fill: string | null;
    },
  ): Promise<void> {
    await queryRunner.query(
      `
      UPDATE \`report_data_dictionary\`
      SET \`field_label\` = ${sqlValue(fields.label)},
          \`explanation\` = ${sqlValue(fields.explanation)},
          \`sort_order\` = ${sqlInt(fields.sortOrder)},
          \`section\` = ${sqlValue(fields.section)},
          \`section_fill_argb\` = ${sqlValue(fields.fill)}
      WHERE \`report_data_dictionary_id\` = ${sqlInt(id)}
        AND \`workbook_key\` = '${WORKBOOK_KEY}'
      `,
    );
  }

  private async writeInsert(
    queryRunner: QueryRunner,
    slot: DictionarySlot,
    sortOrder: number,
  ): Promise<void> {
    await queryRunner.query(
      `
      INSERT INTO \`report_data_dictionary\`
        (\`workbook_key\`, \`section\`, \`field_label\`, \`explanation\`, \`sort_order\`, \`is_active\`, \`section_fill_argb\`)
      VALUES
        ('${WORKBOOK_KEY}', NULL, ${sqlValue(slot.label)}, ${sqlValue(slot.explanation)}, ${sqlInt(sortOrder)}, 1, NULL)
      `,
    );
  }

  private async deleteIds(
    queryRunner: QueryRunner,
    ids: number[],
  ): Promise<void> {
    if (ids.length === 0) {
      throw new Error(`${GUARD}: no inserted rows to delete.`);
    }
    await queryRunner.query(
      `
      DELETE FROM \`report_data_dictionary\`
      WHERE \`workbook_key\` = '${WORKBOOK_KEY}'
        AND \`report_data_dictionary_id\` IN (${ids.map((id) => sqlInt(id)).join(', ')})
      `,
    );
  }
}
