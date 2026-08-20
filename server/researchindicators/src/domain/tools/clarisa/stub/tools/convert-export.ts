/**
 * Converter — PRMS export (Excel) + committed global-unit dictionary → CLARISA-shaped fixture.
 *
 * [SPEC bilateral/clarisa-fixture-stub] T-02.
 *
 * Standalone script. No Nest bootstrap, no DI container — run with:
 *   ./node_modules/.bin/ts-node -T src/domain/tools/clarisa/stub/tools/convert-export.ts <path-to-export.xlsx>
 * from `server/researchindicators` (or set PRMS_EXPORT_PATH instead of the CLI arg).
 *
 * The export (`prms-projects-20260818.xlsx`, sheet `Projects`) is NOT committed to this repo
 * (DD-7 — it carries PI names and emails). It must be supplied at run time from wherever it
 * was downloaded; this script never writes it anywhere.
 *
 * Deterministic by construction (R-CFS-007): given the identical export file and the
 * committed dictionary, two runs produce a byte-identical fixture. Nothing in this file reads
 * the wall clock (`Date.now()`, `new Date()`) — the export date recorded in the provenance
 * file is parsed from the export's own filename.
 *
 * Fails loudly and writes nothing on any error — an unknown program code, a missing export
 * file, a missing dictionary/provenance file, or an unparseable cell aborts before either
 * output file is touched (same K-014 discipline as `harvest-reference.ts`).
 *
 * The 32 CLARISA project keys and the 11 mapping keys are declared explicitly below — NEVER
 * derived from `clarisa-reference-capture.json`. T-04 compares this converter's output against
 * that reference capture independently; sourcing the key list from the same file the check
 * compares against would make the check tautological and unable to fail (KZ-001).
 *
 * Field mapping (export column → CLARISA field), per design §5.2 / proposal §10:
 *   ID → id · Code → external_code · Name → short_name AND full_name (verbatim, same value
 *   on both sides in the real feed) · Center Acronym → source_center_acronym (a deliberate
 *   divergence from CLARISA, which returns null today — D-1) · Funding Source →
 *   source_of_funding · Total Budget → total_budget · Remaining Budget → remaining ·
 *   FY Budget → annual · Summary/Description columns → summary/description ·
 *   Start/End Date → start_date/end_date · phase is always the number 2026 (constant, no
 *   export column) · Program N / Allc % / Complementarity / Efficiency / Justification →
 *   one project_mappings_array entry per non-blank program slot.
 *
 * Everything else CLARISA returns but the export cannot supply takes the value CLARISA
 * itself returns for it: null for source_status, source_snapshot_id, source_created_at,
 * source_updated_at, source_center_name, source_funder (the six source_* fields the export
 * has no counterpart for — source_of_funding and source_center_acronym are populated, see
 * above), external_source, external_project_id, external_record_id, last_synced_at,
 * interim_director_review, project_results, lead_institution_object,
 * funder_institution_object, organization_code and funder_code (both are numeric institution
 * ids; there is no committed institution dictionary, and inventing one would be exactly the
 * synthesis DD-2/D-6 forbid); [] for project_countries_array. Principal Investigator / Name /
 * Email are dropped entirely — CLARISA has no counterpart for them (R-CFS-001).
 */
import { basename, join } from 'path';
import { existsSync, readFileSync, writeFileSync } from 'fs';
import ExcelJS from 'exceljs';

const FIXTURES_DIR = join(__dirname, '..', 'fixtures');
const DICTIONARY_PATH = join(
  FIXTURES_DIR,
  'clarisa-global-units.dictionary.json',
);
const PROVENANCE_PATH = join(FIXTURES_DIR, 'clarisa-projects.provenance.json');
const FIXTURE_PATH = join(FIXTURES_DIR, 'clarisa-projects.fixture.json');

const SHEET_NAME = 'Projects';
const FIXED_PHASE = 2026;
const CONFIRMED_STATUS = 'Confirmed';
const PROGRAM_SLOTS = [1, 2, 3] as const;

// Declared explicitly here — see the header comment on why this is never read out of
// clarisa-reference-capture.json. This IS the 32-key contract this converter promises.
const PROJECT_KEY_ORDER: readonly string[] = [
  'id',
  'short_name',
  'full_name',
  'summary',
  'description',
  'start_date',
  'end_date',
  'total_budget',
  'remaining',
  'annual',
  'source_of_funding',
  'phase',
  'external_source',
  'external_project_id',
  'external_record_id',
  'external_code',
  'source_status',
  'source_snapshot_id',
  'source_created_at',
  'source_updated_at',
  'last_synced_at',
  'source_center_name',
  'source_center_acronym',
  'source_funder',
  'organization_code',
  'funder_code',
  'interim_director_review',
  'project_results',
  'lead_institution_object',
  'funder_institution_object',
  'project_countries_array',
  'project_mappings_array',
];

const MAPPING_KEY_ORDER: readonly string[] = [
  'id',
  'project_id',
  'program_id',
  'allocation',
  'source_program_code',
  'source_program_name',
  'complementarity',
  'efficiencies',
  'comments',
  'status',
  'global_unit_object',
];

const HML_TO_WORD: Record<string, 'high' | 'medium' | 'low'> = {
  H: 'high',
  M: 'medium',
  L: 'low',
};

const EXPORT_COLUMNS = {
  ID: 'ID',
  CODE: 'Code',
  NAME: 'Name',
  CENTER_ACRONYM: 'Center Acronym',
  START_DATE: 'Start Date',
  END_DATE: 'End Date',
  FUNDING_SOURCE: 'Funding Source',
  FY_BUDGET: 'FY Budget',
  TOTAL_BUDGET: 'Total Budget',
  REMAINING_BUDGET: 'Remaining Budget',
  SUMMARY: 'Summary (max. 150 words)',
  DESCRIPTION: 'Project Description (max. 5000 words)',
} as const;

const REQUIRED_COLUMNS: readonly string[] = [
  ...Object.values(EXPORT_COLUMNS),
  ...PROGRAM_SLOTS.flatMap((n) => [
    `Program ${n}`,
    `Program ${n} Allc %`,
    `Program ${n} Complementarity (HML)`,
    `Program ${n} Efficiency (HML)`,
    `Program ${n} Justification`,
  ]),
];

interface GlobalUnitObject {
  [key: string]: unknown;
}

type GlobalUnitDictionary = Record<string, GlobalUnitObject>;

interface RawProgramSlot {
  code: string;
  allocation: string;
  complementarity: string;
  efficiency: string;
  justification: string;
}

interface RawProjectRow {
  rowNumber: number;
  id: string;
  code: string;
  name: string;
  centerAcronym: string;
  startDate: string;
  endDate: string;
  fundingSource: string;
  fyBudget: string;
  totalBudget: string;
  remainingBudget: string;
  summary: string;
  description: string;
  programs: RawProgramSlot[];
}

interface MappingFixture {
  [key: string]: unknown;
}

interface ProjectFixture {
  [key: string]: unknown;
}

/**
 * Thrown when a row references a program code absent from the dictionary (R-CFS-002
 * scenario "An unknown program code stops the converter"). Never caught silently — it must
 * abort the whole run rather than degrade the mapping or fabricate a `global_unit_object`.
 */
class UnknownProgramCodeError extends Error {
  constructor(
    public readonly code: string,
    public readonly rowNumber: number,
    public readonly projectId: string,
  ) {
    super(
      `Unknown program code "${code}" at export row ${rowNumber} (project ID ${projectId}) ` +
        'is not present in the global-unit dictionary. Refusing to fabricate a global_unit_object ' +
        'or silently drop the mapping.',
    );
    this.name = 'UnknownProgramCodeError';
  }
}

function fail(message: string): never {
  // Never commit artifacts from a partial or failed conversion (K-014) — abort loudly,
  // write nothing.
  console.error(`[convert-export] ${message}`);
  console.error('[convert-export] Aborting; nothing written.');
  process.exit(1);
}

function assertKeys(
  obj: Record<string, unknown>,
  expected: readonly string[],
  label: string,
): void {
  const actual = Object.keys(obj);
  const missing = expected.filter((k) => !actual.includes(k));
  const extra = actual.filter((k) => !expected.includes(k));
  if (missing.length > 0 || extra.length > 0) {
    throw new Error(
      `${label} key mismatch. Missing: [${missing.join(', ')}]. Extra: [${extra.join(', ')}].`,
    );
  }
}

function translateHml(raw: string): 'high' | 'medium' | 'low' {
  const key = raw.trim().toUpperCase();
  const word = HML_TO_WORD[key];
  if (!word) {
    throw new Error(
      `Unrecognised HML value "${raw}" — expected one of H, M, L (case-insensitive).`,
    );
  }
  return word;
}

function formatMoney(raw: string): string {
  const numeric = Number(raw === '' ? 0 : raw);
  if (Number.isNaN(numeric)) {
    throw new Error(`Non-numeric monetary value: "${raw}".`);
  }
  return numeric.toFixed(2);
}

function orNull(value: string): string | null {
  return value === '' ? null : value;
}

/**
 * Builds the project_mappings_array for one row — the requirement the whole fidelity
 * argument rests on (R-CFS-002). Never fabricates a global_unit_object: looks each program
 * code up in the dictionary and throws (UnknownProgramCodeError) rather than inventing one
 * or silently dropping the mapping.
 */
function buildMappings(
  raw: RawProjectRow,
  projectId: number,
  dictionary: GlobalUnitDictionary,
  firstMappingId: number,
): { mappings: MappingFixture[]; nextMappingId: number } {
  const mappings: MappingFixture[] = [];
  let mappingId = firstMappingId;

  for (const slot of raw.programs) {
    const globalUnitObject = dictionary[slot.code];
    if (!globalUnitObject) {
      throw new UnknownProgramCodeError(slot.code, raw.rowNumber, raw.id);
    }

    const mapping: MappingFixture = {
      id: mappingId,
      project_id: projectId,
      program_id: globalUnitObject.id,
      allocation: Number(slot.allocation),
      source_program_code: null,
      source_program_name: null,
      complementarity: translateHml(slot.complementarity),
      efficiencies: translateHml(slot.efficiency),
      comments: orNull(slot.justification),
      status: CONFIRMED_STATUS,
      // Verbatim from the dictionary — no spread, no re-key, no re-serialization (DD-2 /
      // R-CFS-002 AC.1). T-04 asserts byte-equality against this same dictionary entry.
      global_unit_object: globalUnitObject,
    };
    assertKeys(
      mapping,
      MAPPING_KEY_ORDER,
      `Mapping ${mappingId} (project ${projectId}, program ${slot.code})`,
    );
    mappings.push(mapping);
    mappingId += 1;
  }

  return { mappings, nextMappingId: mappingId };
}

/**
 * Builds one CLARISA-shaped project object. Every field CLARISA returns is present; fields
 * the export cannot supply take the exact value CLARISA itself returns for them (R-CFS-001)
 * rather than being omitted or fabricated.
 */
function buildProject(
  raw: RawProjectRow,
  mappings: MappingFixture[],
): ProjectFixture {
  const project: ProjectFixture = {
    id: Number(raw.id),
    short_name: raw.name,
    full_name: raw.name,
    summary: orNull(raw.summary),
    description: orNull(raw.description),
    start_date: orNull(raw.startDate),
    end_date: orNull(raw.endDate),
    total_budget: formatMoney(raw.totalBudget),
    remaining: formatMoney(raw.remainingBudget),
    annual: formatMoney(raw.fyBudget),
    source_of_funding: raw.fundingSource,
    phase: FIXED_PHASE,
    external_source: null,
    external_project_id: null,
    external_record_id: null,
    external_code: raw.code,
    source_status: null,
    source_snapshot_id: null,
    source_created_at: null,
    source_updated_at: null,
    last_synced_at: null,
    source_center_name: null,
    // Deliberate divergence from CLARISA (D-1): CLARISA returns null here today.
    // Populating it from the export's Center Acronym is what lets `isAllianceProject`
    // evaluate branch 1 (source_center_acronym) instead of the lead-institution fallback —
    // recorded as a divergence, not an accident (R-CFS-005 D-1).
    source_center_acronym: raw.centerAcronym,
    source_funder: null,
    // No institution-id dictionary exists for lead/funder institutions — same reasoning as
    // lead_institution_object/funder_institution_object below. Inventing a numeric id from
    // a name/acronym would be exactly the synthesis DD-2/D-6 forbid.
    organization_code: null,
    funder_code: null,
    interim_director_review: null,
    project_results: null,
    lead_institution_object: null,
    funder_institution_object: null,
    project_countries_array: [],
    project_mappings_array: mappings,
  };

  assertKeys(project, PROJECT_KEY_ORDER, `Project ${String(project.id)}`);
  return project;
}

/**
 * Pure conversion core — no I/O, no file paths, no process.exit. Takes already-extracted
 * raw rows and the dictionary, returns the fixture array in export row order. Exported so
 * tests can drive it with synthetic rows instead of a real .xlsx file — this is the seam
 * the named falsifying inputs (K-012) run through.
 */
function convertRows(
  rows: RawProjectRow[],
  dictionary: GlobalUnitDictionary,
): ProjectFixture[] {
  let nextMappingId = 1;
  return rows.map((raw) => {
    const projectId = Number(raw.id);
    const { mappings, nextMappingId: after } = buildMappings(
      raw,
      projectId,
      dictionary,
      nextMappingId,
    );
    nextMappingId = after;
    return buildProject(raw, mappings);
  });
}

/**
 * Reads the export and extracts each data row into a plain, already-validated
 * `RawProjectRow` — the only place this file talks to `exceljs`. Validates the sheet and
 * every required column exist before reading a single row (K-014: check for an error
 * before counting).
 */
async function readExportRows(exportPath: string): Promise<RawProjectRow[]> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(exportPath);

  const sheet = workbook.getWorksheet(SHEET_NAME);
  if (!sheet) {
    throw new Error(
      `Sheet "${SHEET_NAME}" not found in ${exportPath}. Sheets present: ${workbook.worksheets
        .map((s) => s.name)
        .join(', ')}`,
    );
  }

  const headerMap = new Map<string, number>();
  sheet.getRow(1).eachCell({ includeEmpty: true }, (cell, colNumber) => {
    const header = String(cell.value ?? '').trim();
    if (header) headerMap.set(header, colNumber);
  });

  const missingColumns = REQUIRED_COLUMNS.filter((c) => !headerMap.has(c));
  if (missingColumns.length > 0) {
    throw new Error(
      `Export is missing expected column(s): ${missingColumns.join(', ')}`,
    );
  }

  const cellText = (row: ExcelJS.Row, header: string): string => {
    const col = headerMap.get(header) as number;
    const value = row.getCell(col).value;
    if (value === null || value === undefined) return '';
    return String(value).trim();
  };

  const rows: RawProjectRow[] = [];
  for (let r = 2; r <= sheet.rowCount; r++) {
    const row = sheet.getRow(r);
    const id = cellText(row, EXPORT_COLUMNS.ID);
    if (!id) continue; // trailing blank row

    const programs: RawProgramSlot[] = [];
    for (const n of PROGRAM_SLOTS) {
      const code = cellText(row, `Program ${n}`);
      if (!code) continue;
      programs.push({
        code,
        allocation: cellText(row, `Program ${n} Allc %`),
        complementarity: cellText(row, `Program ${n} Complementarity (HML)`),
        efficiency: cellText(row, `Program ${n} Efficiency (HML)`),
        justification: cellText(row, `Program ${n} Justification`),
      });
    }

    rows.push({
      rowNumber: r,
      id,
      code: cellText(row, EXPORT_COLUMNS.CODE),
      name: cellText(row, EXPORT_COLUMNS.NAME),
      centerAcronym: cellText(row, EXPORT_COLUMNS.CENTER_ACRONYM),
      startDate: cellText(row, EXPORT_COLUMNS.START_DATE),
      endDate: cellText(row, EXPORT_COLUMNS.END_DATE),
      fundingSource: cellText(row, EXPORT_COLUMNS.FUNDING_SOURCE),
      fyBudget: cellText(row, EXPORT_COLUMNS.FY_BUDGET),
      totalBudget: cellText(row, EXPORT_COLUMNS.TOTAL_BUDGET),
      remainingBudget: cellText(row, EXPORT_COLUMNS.REMAINING_BUDGET),
      summary: cellText(row, EXPORT_COLUMNS.SUMMARY),
      description: cellText(row, EXPORT_COLUMNS.DESCRIPTION),
      programs,
    });
  }

  if (rows.length === 0) {
    throw new Error(
      'Export produced zero data rows — the fetch/read succeeded but the sheet is empty. ' +
        'This is incomplete, not empty; refusing to write a fixture from it (K-014).',
    );
  }

  return rows;
}

function loadDictionary(path: string): GlobalUnitDictionary {
  if (!existsSync(path)) {
    throw new Error(
      `Dictionary not found at ${path}. Run T-01's harvest-reference.ts first.`,
    );
  }
  return JSON.parse(readFileSync(path, 'utf-8')) as GlobalUnitDictionary;
}

/**
 * Parses the export date out of the export's own filename (e.g. `prms-projects-20260818.xlsx`
 * → `2026-08-18`). Never `new Date()` / `Date.now()` — that would make the provenance file,
 * and by extension every downstream diff of it, non-deterministic across runs (R-CFS-007).
 */
function parseExportDate(filename: string): string {
  const match = filename.match(/(\d{4})(\d{2})(\d{2})/);
  if (!match) {
    throw new Error(
      `Could not parse an export date (YYYYMMDD) out of the filename "${filename}".`,
    );
  }
  return `${match[1]}-${match[2]}-${match[3]}`;
}

function buildExportBlock(
  exportPath: string,
  rowCount: number,
  mappingCount: number,
): Record<string, unknown> {
  const filename = basename(exportPath);
  return {
    source_filename: filename,
    export_date: parseExportDate(filename),
    row_count: rowCount,
    mapping_count: mappingCount,
  };
}

/**
 * Read-merge-write: adds the `export` block alongside T-01's existing `capture` block
 * without disturbing it. `harvest-reference.ts` rebuilds and overwrites the whole file, so a
 * re-harvest after this step would otherwise silently discard `export` — this function is
 * what keeps both blocks alive together (forward pointer from T-01's review, advisory B).
 */
function mergeProvenance(
  existingRaw: string,
  exportBlock: Record<string, unknown>,
): string {
  const existing = JSON.parse(existingRaw) as {
    capture?: unknown;
    removal_condition?: string;
    [key: string]: unknown;
  };

  if (!existing.capture) {
    throw new Error(
      "Existing provenance file has no `capture` block — refusing to overwrite T-01's data blindly.",
    );
  }
  if (!existing.removal_condition) {
    throw new Error(
      'Existing provenance file has no `removal_condition` — refusing to overwrite.',
    );
  }

  const merged = {
    capture: existing.capture,
    export: exportBlock,
    removal_condition: existing.removal_condition,
  };
  return JSON.stringify(merged, null, 2) + '\n';
}

async function main(): Promise<void> {
  const exportPath = process.argv[2] ?? process.env.PRMS_EXPORT_PATH;
  if (!exportPath) {
    fail(
      'No export path given. Usage: convert-export.ts <path-to-export.xlsx> ' +
        '(or set PRMS_EXPORT_PATH).',
    );
  }
  if (!existsSync(exportPath)) {
    fail(`Export file not found at ${exportPath}.`);
  }
  if (!existsSync(PROVENANCE_PATH)) {
    fail(
      `Provenance file not found at ${PROVENANCE_PATH}. Run T-01's harvest-reference.ts first.`,
    );
  }

  try {
    const dictionary = loadDictionary(DICTIONARY_PATH);
    console.log(
      `[convert-export] Dictionary loaded: ${Object.keys(dictionary).length} entries.`,
    );

    const rawRows = await readExportRows(exportPath);
    console.log(`[convert-export] Export rows read: ${rawRows.length}.`);

    const projects = convertRows(rawRows, dictionary);
    const mappingCount = projects.reduce(
      (sum, p) => sum + (p.project_mappings_array as unknown[]).length,
      0,
    );
    console.log(
      `[convert-export] Converted: ${projects.length} projects, ${mappingCount} mappings.`,
    );

    const fixtureJson = JSON.stringify(projects, null, 2) + '\n';
    const existingProvenance = readFileSync(PROVENANCE_PATH, 'utf-8');
    const exportBlock = buildExportBlock(
      exportPath,
      rawRows.length,
      mappingCount,
    );
    const provenanceJson = mergeProvenance(existingProvenance, exportBlock);

    // Both outputs are fully computed and validated before either is written — a failure
    // above this line writes nothing (K-014 discipline).
    writeFileSync(FIXTURE_PATH, fixtureJson);
    writeFileSync(PROVENANCE_PATH, provenanceJson);

    console.log(
      `[convert-export] Wrote:\n  ${FIXTURE_PATH}\n  ${PROVENANCE_PATH}`,
    );
  } catch (err) {
    fail(err instanceof Error ? (err.stack ?? err.message) : String(err));
  }
}

// Exported so tests can drive the pure conversion core directly, and so a future consumer
// (e.g. a re-run after a new export) can reuse the building blocks without re-implementing
// them (never re-derive the key list from clarisa-reference-capture.json — see header).
export {
  translateHml,
  formatMoney,
  orNull,
  assertKeys,
  buildMappings,
  buildProject,
  convertRows,
  readExportRows,
  loadDictionary,
  parseExportDate,
  buildExportBlock,
  mergeProvenance,
  UnknownProgramCodeError,
  PROJECT_KEY_ORDER,
  MAPPING_KEY_ORDER,
};
export type {
  RawProjectRow,
  RawProgramSlot,
  GlobalUnitDictionary,
  GlobalUnitObject,
  ProjectFixture,
  MappingFixture,
};

if (require.main === module) {
  main().catch((err) => {
    fail(
      `Unhandled error: ${err instanceof Error ? (err.stack ?? err.message) : err}`,
    );
  });
}
