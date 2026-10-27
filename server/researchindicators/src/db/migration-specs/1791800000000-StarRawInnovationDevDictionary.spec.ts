import { readFileSync } from 'fs';
import { join } from 'path';
import { QueryRunner } from 'typeorm';
import { StarRawInnovationDevDictionary1791800000000 } from '../migrations/1791800000000-StarRawInnovationDevDictionary';

/**
 * Structural spec for the Innovation Development dictionary migration
 * (docs/specs/innovation-dev/excel-export T-03, R-IDX-006, NFR-IDX-003,
 * NFR-IDX-004, D5).
 *
 * UNIT test (`npm test`) — a fake QueryRunner records SQL. It never
 * opens MySQL. Whether up/down restore rows is the fixture's job.
 *
 * CANNOT PROVE (KZ-017): Dev's or Prod's real dictionary rows (P-14),
 * and that MySQL accepts the statements.
 */

const NAMED_PLACEHOLDER = /(?:\?)|(?::(\d+|[a-zA-Z][a-zA-Z0-9_]*))/g;

const SEED_LABELS = [
  'Short title',
  'Innovation nature',
  'Innovation type',
  'Innovation readiness level',
  'Readiness explanation ',
  'Actors',
  'Organizations',
  'Intended beneficiaries/users elaborated\n',
  'Expected outcomes ',
  'Potential for researchers/policymakers adaptation',
  'Method/tool qualifies for dissemination\n',
  'Context for tool usefulness',
  'Results detailed with examples',
  'Tool function',
  'Innovation used beyond original context',
  'Adopted and adapted in other contexts',
  'Tools often used together',
  'Other tools',
  "Other tools' usage with this one description",
  'Formulation:\nIs it cheaper compared to alternatives?',
  'Formulation: Is it simpler to use?',
  'Formulation: Does it perform better?',
  'Demand and Investment: \nIs the innovation desirable to intended\nusers?',
  'Demand and Investment: Is the innovation commercially viable/is there\ninvestment potential?',
  'Sustained use: Is the innovation supported by a suitable enabling\nenvironment?',
  'Sustained use: Is there already evidence of\nuptake? ',
  'Sustained use: Is there potential for actor in new contexts and for new purposes? ',
];

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
];

const INSERT_INDEXES = [3, 4, 7, 8, 31];

type RunnerOptions = {
  mismatchIndex?: number;
  finalMismatch?: boolean;
  anchorRows?: number;
  empty?: boolean;
  partial?: 'details' | 'development';
  dropTrailingSpace?: boolean;
};

function maskQuotedStrings(sql: string): string {
  let out = '';
  let i = 0;
  while (i < sql.length) {
    const chr = sql[i];
    if (chr === "'" || chr === '"') {
      const quote = chr;
      out += ' ';
      i += 1;
      while (i < sql.length) {
        if (sql[i] === '\\') {
          out += '  ';
          i += 2;
          continue;
        }
        if (sql[i] === quote) {
          if (sql[i + 1] === quote) {
            out += '  ';
            i += 2;
            continue;
          }
          out += ' ';
          i += 1;
          break;
        }
        out += ' ';
        i += 1;
      }
      continue;
    }
    out += chr;
    i += 1;
  }
  return out;
}

function isWrite(sql: string): boolean {
  return /^\s*(UPDATE|INSERT|DELETE)\b/i.test(sql);
}

function whereClause(sql: string): string {
  const match = /\bWHERE\b([\s\S]*)$/i.exec(sql);
  return match ? match[1] : '';
}

function createRunner(options: RunnerOptions = {}): {
  runner: QueryRunner;
  calls: string[];
} {
  const calls: string[] = [];
  const runner = {
    query: jest.fn(async (sql: string, params?: unknown[]) => {
      expect(params).toBeUndefined();
      calls.push(sql);
      if (isWrite(sql)) {
        return { affectedRows: 1 };
      }
      if (sql.includes('AS anchor_count')) {
        if (options.empty) {
          return [{ anchor_count: 0, details_count: 0, development_count: 0 }];
        }
        if (options.partial === 'details') {
          return [{ anchor_count: 0, details_count: 1, development_count: 0 }];
        }
        if (options.partial === 'development') {
          return [{ anchor_count: 0, details_count: 0, development_count: 1 }];
        }
        return [
          {
            anchor_count: options.anchorRows ?? 1,
            details_count: 1,
            development_count: 1,
          },
        ];
      }
      if (sql.includes('MAX(`sort_order`)')) {
        return [{ max_sort: 87 }];
      }
      if (sql.includes("`section` = 'Innovation Development'")) {
        return [{ id: 880, sort_order: 88, field_label: FINAL_LABELS[0] }];
      }
      if (sql.includes("`field_label` = 'Link to Innovation Use'")) {
        const count = options.anchorRows ?? 1;
        return Array.from({ length: count }, () => ({
          id: 500,
          sort_order: 58,
          field_label: 'Link to Innovation Use',
        }));
      }
      const between = /BETWEEN (\d+) AND (\d+)/.exec(sql);
      if (!between) {
        throw new Error(`unexpected read: ${sql}`);
      }
      const from = Number(between[1]);
      const span = Number(between[2]) - from + 1;
      if (span === SEED_LABELS.length) {
        return SEED_LABELS.map((label, index) => ({
          id: 1000 + index,
          sort_order: from + index,
          field_label:
            options.dropTrailingSpace && index === 4
              ? label.replace(/ $/, '')
              : options.mismatchIndex === index
                ? `${label} changed`
                : label,
        }));
      }
      if (span === FINAL_LABELS.length) {
        return FINAL_LABELS.map((label, index) => ({
          id: 2000 + index,
          sort_order: from + index,
          field_label:
            options.finalMismatch && index === 0 ? `${label} changed` : label,
        }));
      }
      throw new Error(`unexpected range span ${span}`);
    }),
  };
  return { runner: runner as unknown as QueryRunner, calls };
}

function normalise(value: string): string {
  return value.replace(/\s*\n\s*/g, ' ').trim();
}

describe('StarRawInnovationDevDictionary1791800000000', () => {
  it('keeps every seed label byte-exact in the migration source', () => {
    const seedPath = join(
      __dirname,
      '../migrations/seed-data/star-results-metadata-dictionary.seed.ts',
    );
    const migrationPath = join(
      __dirname,
      '../migrations/1791800000000-StarRawInnovationDevDictionary.ts',
    );
    const seedSource = readFileSync(seedPath, 'utf8');
    const migrationSource = readFileSync(migrationPath, 'utf8');
    const pattern =
      /sortOrder:\s*(\d+),\s*section:\s*(?:'(?:\\'|[^'])*'|"(?:\\"|[^"])*"),\s*fieldLabel:\s*('(?:\\'|[^'])*'|"(?:\\"|[^"])*")/g;
    const literals: string[] = [];
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(seedSource)) !== null) {
      const sortOrder = Number(match[1]);
      if (sortOrder >= 58 && sortOrder <= 84) {
        literals.push(match[2]);
      }
    }
    expect(literals).toHaveLength(27);
    for (const literal of literals) {
      expect(migrationSource).toContain(literal);
    }
    expect(migrationSource).not.toContain('report_workbook_column_group');
  });

  it('normalises the 27 seed labels onto design section 3.2a, including column 89', () => {
    const seedOrigin = FINAL_LABELS.filter(
      (_, index) => !INSERT_INDEXES.includes(index),
    );
    expect(seedOrigin).toEqual(SEED_LABELS.map((label) => normalise(label)));
    expect(FINAL_LABELS).toHaveLength(32);
    expect(FINAL_LABELS[8]).toBe('Sex and age disaggregation not applicable');
  });

  describe('up()', () => {
    let calls: string[];

    beforeAll(async () => {
      const recorded = createRunner();
      await new StarRawInnovationDevDictionary1791800000000().up(
        recorded.runner,
      );
      calls = recorded.calls;
    });

    it('updates 27 rows by id and inserts the 5 new labels, with no placeholders', () => {
      const writes = calls.filter((sql) => isWrite(sql));
      const updates = writes.filter((sql) => /^\s*UPDATE\b/i.test(sql));
      const inserts = writes.filter((sql) => /^\s*INSERT\b/i.test(sql));
      expect(updates).toHaveLength(27);
      expect(inserts).toHaveLength(5);
      expect(
        calls.filter((sql) => sql.includes('MAX(`sort_order`)')),
      ).toHaveLength(1);
      for (const sql of writes) {
        expect(whereClause(sql)).not.toMatch(/field_label/i);
        expect(sql).not.toContain('report_workbook_column_group');
      }
      for (const sql of updates) {
        expect(whereClause(sql)).toMatch(/`report_data_dictionary_id` = \d+/);
        expect(sql).not.toMatch(/\bMAX\s*\(/i);
      }
      const joined = writes.join('\n');
      expect(joined).toContain("`field_label` = 'Short title'");
      expect(joined).toContain('`sort_order` = 88');
      expect(joined).toContain("`section` = 'Innovation Development'");
      expect(joined).toContain("`section_fill_argb` = 'FF00897B'");
      expect(joined).toContain("'Sex and age disaggregation not applicable'");
      expect(joined).toContain("'Expansion and adaptation details'");
      expect(joined).toContain('119, 1, NULL');
      const masked = maskQuotedStrings(calls.join('\n'));
      NAMED_PLACEHOLDER.lastIndex = 0;
      expect(masked.match(NAMED_PLACEHOLDER)).toBeNull();
      const updateExplanations = [
        ...joined.matchAll(/`explanation` = '([^']*)'/g),
      ].map((item) => item[1]);
      const insertExplanations = [
        ...joined.matchAll(
          /\('star_results_metadata', NULL, '[^']*', '([^']+)', \d+, 1, NULL\)/g,
        ),
      ].map((item) => item[1]);
      expect(updateExplanations).toHaveLength(27);
      expect(insertExplanations).toHaveLength(5);
      expect(
        [...updateExplanations, ...insertExplanations].every(
          (text) => text.length > 0,
        ),
      ).toBe(true);
    });

    it('throws before any write when a block label does not match the seed', async () => {
      const recorded = createRunner({ mismatchIndex: 0 });
      await expect(
        new StarRawInnovationDevDictionary1791800000000().up(recorded.runner),
      ).rejects.toThrow(/dictionary guard: block position 1 label mismatch/);
      expect(recorded.calls.filter((sql) => isWrite(sql))).toHaveLength(0);
    });

    it('throws before any write when the anchor is not exactly one row', async () => {
      const recorded = createRunner({ anchorRows: 2 });
      await expect(
        new StarRawInnovationDevDictionary1791800000000().up(recorded.runner),
      ).rejects.toThrow(/dictionary guard: anchor/);
      expect(recorded.calls.filter((sql) => isWrite(sql))).toHaveLength(0);
    });

    it('does nothing and issues no writes when the dictionary was never seeded', async () => {
      const recorded = createRunner({ empty: true });
      await expect(
        new StarRawInnovationDevDictionary1791800000000().up(recorded.runner),
      ).resolves.toBeUndefined();
      expect(recorded.calls.filter((sql) => isWrite(sql))).toHaveLength(0);
      expect(
        recorded.calls.some((sql) => sql.includes('AS anchor_count')),
      ).toBe(true);
    });

    it('throws before any write when the anchor is absent but seed rows exist', async () => {
      const recorded = createRunner({ partial: 'details' });
      await expect(
        new StarRawInnovationDevDictionary1791800000000().up(recorded.runner),
      ).rejects.toThrow(/anchor absent while seed or final rows exist/);
      expect(recorded.calls.filter((sql) => isWrite(sql))).toHaveLength(0);
    });

    it('throws before any write when a trailing space was dropped from the seed label', async () => {
      const recorded = createRunner({ dropTrailingSpace: true });
      await expect(
        new StarRawInnovationDevDictionary1791800000000().up(recorded.runner),
      ).rejects.toThrow(/dictionary guard: block position 5 label mismatch/);
      expect(recorded.calls.filter((sql) => isWrite(sql))).toHaveLength(0);
    });
  });

  describe('down()', () => {
    let calls: string[];

    beforeAll(async () => {
      const recorded = createRunner();
      await new StarRawInnovationDevDictionary1791800000000().down(
        recorded.runner,
      );
      calls = recorded.calls;
    });

    it('restores seed labels relative to the anchor and deletes the 5 inserted ids', () => {
      const writes = calls.filter((sql) => isWrite(sql));
      const updates = writes.filter((sql) => /^\s*UPDATE\b/i.test(sql));
      const deletes = writes.filter((sql) => /^\s*DELETE\b/i.test(sql));
      expect(updates).toHaveLength(27);
      expect(deletes).toHaveLength(1);
      for (const sql of writes) {
        expect(whereClause(sql)).not.toMatch(/field_label/i);
        expect(whereClause(sql)).toMatch(/`report_data_dictionary_id`/);
      }
      const joined = writes.join('\n');
      expect(joined).toContain("`field_label` = 'Readiness explanation '");
      expect(joined).toContain('`explanation` = NULL');
      expect(joined).not.toContain("`explanation` = ''");
      expect(joined).toContain('`sort_order` = 59');
      expect(joined).toContain("`section` = 'Innovation details'");
      expect(joined).toContain("`section_fill_argb` = 'FF00897B'");
      expect(joined).not.toContain('`sort_order` = 58');
      expect(deletes[0]).toContain(
        '`report_data_dictionary_id` IN (2003, 2004, 2007, 2008, 2031)',
      );
      const masked = maskQuotedStrings(calls.join('\n'));
      NAMED_PLACEHOLDER.lastIndex = 0;
      expect(masked.match(NAMED_PLACEHOLDER)).toBeNull();
    });

    it('throws before any write when a final label does not match', async () => {
      const recorded = createRunner({ finalMismatch: true });
      await expect(
        new StarRawInnovationDevDictionary1791800000000().down(recorded.runner),
      ).rejects.toThrow(/dictionary guard: block position 1 label mismatch/);
      expect(recorded.calls.filter((sql) => isWrite(sql))).toHaveLength(0);
    });

    it('does nothing and issues no writes when the dictionary was never seeded', async () => {
      const recorded = createRunner({ empty: true });
      await expect(
        new StarRawInnovationDevDictionary1791800000000().down(recorded.runner),
      ).resolves.toBeUndefined();
      expect(recorded.calls.filter((sql) => isWrite(sql))).toHaveLength(0);
    });

    it('throws before any write when the anchor is absent but final rows exist', async () => {
      const recorded = createRunner({ partial: 'development' });
      await expect(
        new StarRawInnovationDevDictionary1791800000000().down(recorded.runner),
      ).rejects.toThrow(/anchor absent while seed or final rows exist/);
      expect(recorded.calls.filter((sql) => isWrite(sql))).toHaveLength(0);
    });
  });
});
