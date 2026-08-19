/**
 * [SPEC bilateral/clarisa-fixture-stub] T-02.
 *
 * Tests the pure conversion core exported by `convert-export.ts` — never the CLI entry
 * point (`main()`), which does I/O and calls `process.exit`. Expected values are drawn from
 * requirements.md's R-CFS-001/R-CFS-002 scenarios and acceptance criteria, and from the
 * dictionary T-01 actually committed (`clarisa-global-units.dictionary.json`) — never
 * recomputed the way the implementation computes them, per the tdd skill's
 * anti-tautological rule.
 */
import {
  assertKeys,
  buildExportBlock,
  buildMappings,
  buildProject,
  convertRows,
  formatMoney,
  MAPPING_KEY_ORDER,
  mergeProvenance,
  orNull,
  parseExportDate,
  PROJECT_KEY_ORDER,
  translateHml,
  UnknownProgramCodeError,
  type GlobalUnitDictionary,
  type RawProjectRow,
} from './convert-export';

// A tiny, hand-built dictionary — deliberately NOT read from the committed T-01 dictionary
// file, so these tests don't share a frame with the code under test (KZ-001).
const DICTIONARY: GlobalUnitDictionary = {
  SP01: {
    id: 267,
    smo_code: 'SP01',
    cgiar_entity_type_object: { code: 22, name: 'Science programs' },
  },
  SP09: {
    id: 275,
    smo_code: 'SP09',
    cgiar_entity_type_object: { code: 23, name: 'Scaling programs' },
  },
};

function rawRow(overrides: Partial<RawProjectRow> = {}): RawProjectRow {
  return {
    rowNumber: 2,
    id: '42',
    code: 'B-A1000',
    name: 'Test Project',
    centerAcronym: 'BIOVERSITY',
    startDate: '2023-01-01',
    endDate: '2027-12-31',
    fundingSource: 'bilateral',
    fyBudget: '1000',
    totalBudget: '2000.5',
    remainingBudget: '500',
    summary: 'A summary',
    description: 'A description',
    programs: [
      {
        code: 'SP01',
        allocation: '60',
        complementarity: 'H',
        efficiency: 'M',
        justification: 'because',
      },
      {
        code: 'SP09',
        allocation: '40',
        complementarity: 'L',
        efficiency: 'L',
        justification: '',
      },
    ],
    ...overrides,
  };
}

describe('translateHml', () => {
  it('translates H, M, L to high, medium, low', () => {
    expect(translateHml('H')).toBe('high');
    expect(translateHml('M')).toBe('medium');
    expect(translateHml('L')).toBe('low');
  });

  it('is case-insensitive and trims whitespace', () => {
    expect(translateHml(' h ')).toBe('high');
  });

  it('throws on an unrecognised letter — vocabulary drift must not degrade silently (DC-3)', () => {
    expect(() => translateHml('X')).toThrow(/Unrecognised HML value/);
  });
});

describe('formatMoney', () => {
  it("formats a numeric string to two decimals, matching CLARISA's real DECIMAL shape", () => {
    expect(formatMoney('2447')).toBe('2447.00');
    expect(formatMoney('968500.43')).toBe('968500.43');
  });

  it('treats a blank cell as zero', () => {
    expect(formatMoney('')).toBe('0.00');
  });

  it('throws on a non-numeric value rather than emitting NaN', () => {
    expect(() => formatMoney('not-a-number')).toThrow(/Non-numeric/);
  });
});

describe('orNull', () => {
  it('maps a blank string to null and leaves a populated one untouched', () => {
    expect(orNull('')).toBeNull();
    expect(orNull('text')).toBe('text');
  });
});

describe('assertKeys', () => {
  it('passes when the object carries exactly the expected keys', () => {
    expect(() => assertKeys({ a: 1, b: 2 }, ['a', 'b'], 'test')).not.toThrow();
  });

  it('fails when a key is missing', () => {
    expect(() => assertKeys({ a: 1 }, ['a', 'b'], 'test')).toThrow(/Missing/);
  });

  it('fails when an extra key is present — both directions must be able to fail (DC-4)', () => {
    expect(() => assertKeys({ a: 1, b: 2, c: 3 }, ['a', 'b'], 'test')).toThrow(
      /Extra/,
    );
  });
});

describe('buildMappings', () => {
  it('builds one mapping per non-blank program, with the dictionary global_unit_object verbatim', () => {
    const { mappings, nextMappingId } = buildMappings(
      rawRow(),
      42,
      DICTIONARY,
      1,
    );

    expect(mappings).toHaveLength(2);
    expect(nextMappingId).toBe(3);

    const [first, second] = mappings;
    expect(first.project_id).toBe(42);
    expect(first.program_id).toBe(267);
    expect(first.allocation).toBe(60);
    expect(typeof first.allocation).toBe('number');
    expect(first.complementarity).toBe('high');
    expect(first.efficiencies).toBe('medium');
    expect(first.comments).toBe('because');
    expect(first.status).toBe('Confirmed');
    // Byte-equal (same reference, not a copy) to the dictionary entry — DD-2/R-CFS-002 AC.1.
    expect(first.global_unit_object).toBe(DICTIONARY.SP01);

    expect(second.program_id).toBe(275);
    expect(second.comments).toBeNull();
  });

  it('carries exactly the 11 real-feed mapping keys, including nulled source_program_code/name', () => {
    const { mappings } = buildMappings(rawRow(), 42, DICTIONARY, 1);
    expect(Object.keys(mappings[0]).sort()).toEqual(
      [...MAPPING_KEY_ORDER].sort(),
    );
    expect(mappings[0].source_program_code).toBeNull();
    expect(mappings[0].source_program_name).toBeNull();
  });

  it('never uses cgiar_entity_type_object.code uniformly — real dictionary values pass through as-is', () => {
    const { mappings } = buildMappings(rawRow(), 42, DICTIONARY, 1);
    const codes = mappings.map(
      (m) =>
        (m.global_unit_object as { cgiar_entity_type_object: { code: number } })
          .cgiar_entity_type_object.code,
    );
    expect(codes).toEqual([22, 23]);
  });

  // Named falsifying input 2 (T-02 task, R-CFS-002 scenario "An unknown program code stops
  // the converter"): a program code absent from the dictionary must stop the converter, not
  // degrade the mapping.
  it('throws UnknownProgramCodeError naming the code, and drops nothing silently — SP14 falsifier', () => {
    const row = rawRow({
      programs: [
        {
          code: 'SP14',
          allocation: '100',
          complementarity: 'H',
          efficiency: 'H',
          justification: '',
        },
      ],
    });

    let caught: unknown;
    try {
      buildMappings(row, 42, DICTIONARY, 1);
    } catch (err) {
      caught = err;
    }

    expect(caught).toBeInstanceOf(UnknownProgramCodeError);
    expect((caught as UnknownProgramCodeError).code).toBe('SP14');
    expect((caught as Error).message).toMatch(/SP14/);
  });
});

describe('buildProject', () => {
  it('carries exactly the 32 declared CLARISA keys, in the declared order', () => {
    const { mappings } = buildMappings(rawRow(), 42, DICTIONARY, 1);
    const project = buildProject(rawRow(), mappings);
    expect(Object.keys(project)).toEqual(PROJECT_KEY_ORDER);
  });

  it('sets phase to the NUMBER 2026, not the string "2026" (R-CFS-001 AC.3, DC-5)', () => {
    const project = buildProject(rawRow(), []);
    expect(project.phase).toBe(2026);
    expect(typeof project.phase).toBe('number');
  });

  it('populates source_of_funding and source_center_acronym from the raw row', () => {
    const project = buildProject(rawRow(), []);
    expect(project.source_of_funding).toBe('bilateral');
    expect(project.source_center_acronym).toBe('BIOVERSITY');
  });

  it('nulls the six unsupplied source_* fields (source_of_funding and source_center_acronym excepted)', () => {
    const project = buildProject(rawRow(), []);
    expect(project.source_status).toBeNull();
    expect(project.source_snapshot_id).toBeNull();
    expect(project.source_created_at).toBeNull();
    expect(project.source_updated_at).toBeNull();
    expect(project.source_center_name).toBeNull();
    expect(project.source_funder).toBeNull();
  });

  it('nulls every other unsupplied field and empties project_countries_array (R-CFS-001)', () => {
    const project = buildProject(rawRow(), []);
    expect(project.external_source).toBeNull();
    expect(project.external_project_id).toBeNull();
    expect(project.external_record_id).toBeNull();
    expect(project.last_synced_at).toBeNull();
    expect(project.interim_director_review).toBeNull();
    expect(project.project_results).toBeNull();
    expect(project.lead_institution_object).toBeNull();
    expect(project.funder_institution_object).toBeNull();
    expect(project.organization_code).toBeNull();
    expect(project.funder_code).toBeNull();
    expect(project.project_countries_array).toEqual([]);
  });

  it('maps external_code from Code and id from ID, as a number', () => {
    const project = buildProject(rawRow({ id: '99', code: 'C-Z999' }), []);
    expect(project.id).toBe(99);
    expect(typeof project.id).toBe('number');
    expect(project.external_code).toBe('C-Z999');
  });

  it('never emits a Principal Investigator field, by construction (R-CFS-001 scenario)', () => {
    const project = buildProject(rawRow(), []);
    const hasPiField = Object.keys(project).some((k) =>
      /principal.?investigator/i.test(k),
    );
    expect(hasPiField).toBe(false);
  });

  it('formats total_budget/remaining/annual as two-decimal strings, and allocation stays numeric on mappings', () => {
    const project = buildProject(
      rawRow({
        totalBudget: '2000.5',
        remainingBudget: '500',
        fyBudget: '1000',
      }),
      [],
    );
    expect(project.total_budget).toBe('2000.50');
    expect(project.remaining).toBe('500.00');
    expect(project.annual).toBe('1000.00');
  });
});

describe('convertRows (end-to-end pure core)', () => {
  it('emits one project per row, in row order, each carrying its own mappings', () => {
    const rows = [
      rawRow({ id: '1', rowNumber: 2 }),
      rawRow({ id: '2', rowNumber: 3, programs: [] }),
    ];
    const projects = convertRows(rows, DICTIONARY);

    expect(projects).toHaveLength(2);
    expect(projects[0].id).toBe(1);
    expect(projects[1].id).toBe(2);
    expect(projects[0].project_mappings_array as unknown[]).toHaveLength(2);
    expect(projects[1].project_mappings_array as unknown[]).toHaveLength(0);
  });

  it('assigns sequential mapping ids across the whole array, not restarted per row', () => {
    const rows = [
      rawRow({ id: '1', rowNumber: 2 }),
      rawRow({ id: '2', rowNumber: 3 }),
    ];
    const projects = convertRows(rows, DICTIONARY);
    const ids = [
      ...(projects[0].project_mappings_array as { id: number }[]),
      ...(projects[1].project_mappings_array as { id: number }[]),
    ].map((m) => m.id);
    expect(ids).toEqual([1, 2, 3, 4]);
  });

  it('propagates UnknownProgramCodeError for the whole run — no fixture-worthy output on a bad row', () => {
    const rows = [
      rawRow({ id: '1' }),
      rawRow({
        id: '2',
        programs: [
          {
            code: 'SP14',
            allocation: '100',
            complementarity: 'H',
            efficiency: 'H',
            justification: '',
          },
        ],
      }),
    ];
    expect(() => convertRows(rows, DICTIONARY)).toThrow(
      UnknownProgramCodeError,
    );
  });

  it('two calls over identical input are deep-equal and serialize to identical bytes (R-CFS-007)', () => {
    const rows = [rawRow({ id: '1' }), rawRow({ id: '2' })];
    const first = convertRows(rows, DICTIONARY);
    const second = convertRows(rows, DICTIONARY);
    expect(JSON.stringify(first)).toBe(JSON.stringify(second));
  });
});

describe('parseExportDate', () => {
  it('parses YYYYMMDD out of the export filename', () => {
    expect(parseExportDate('prms-projects-20260818.xlsx')).toBe('2026-08-18');
  });

  it('throws when the filename carries no date', () => {
    expect(() => parseExportDate('export.xlsx')).toThrow(/Could not parse/);
  });
});

describe('buildExportBlock', () => {
  it('records the source filename, export date, and counts', () => {
    const block = buildExportBlock(
      '/tmp/prms-projects-20260818.xlsx',
      198,
      283,
    );
    expect(block).toEqual({
      source_filename: 'prms-projects-20260818.xlsx',
      export_date: '2026-08-18',
      row_count: 198,
      mapping_count: 283,
    });
  });
});

describe('mergeProvenance', () => {
  it('preserves the existing capture block and removal_condition, and adds export', () => {
    const existing = JSON.stringify({
      capture: { host: 'https://clarisatest-back.ciat.cgiar.org/', foo: 'bar' },
      removal_condition: 'delete it all',
    });
    const merged = JSON.parse(
      mergeProvenance(existing, {
        source_filename: 'x.xlsx',
        export_date: '2026-08-18',
        row_count: 198,
        mapping_count: 283,
      }),
    );

    expect(merged.capture).toEqual({
      host: 'https://clarisatest-back.ciat.cgiar.org/',
      foo: 'bar',
    });
    expect(merged.removal_condition).toBe('delete it all');
    expect(merged.export).toEqual({
      source_filename: 'x.xlsx',
      export_date: '2026-08-18',
      row_count: 198,
      mapping_count: 283,
    });
  });

  it('refuses to merge over a provenance file with no capture block', () => {
    const existing = JSON.stringify({ removal_condition: 'x' });
    expect(() =>
      mergeProvenance(existing, {
        source_filename: 'x.xlsx',
        export_date: '2026-08-18',
        row_count: 1,
        mapping_count: 1,
      }),
    ).toThrow(/capture/);
  });
});
