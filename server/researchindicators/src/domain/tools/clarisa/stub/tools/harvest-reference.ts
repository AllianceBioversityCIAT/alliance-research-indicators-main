/**
 * One-shot harvester — CLARISA live capture → reference capture + global-unit dictionary.
 *
 * [SPEC bilateral/clarisa-fixture-stub] T-01.
 *
 * Standalone script. No Nest bootstrap, no DI container — run with:
 *   ./node_modules/.bin/ts-node -T src/domain/tools/clarisa/stub/tools/harvest-reference.ts
 * from `server/researchindicators`, with ARI_CLARISA_HOST/USER/PASS set in `.env`.
 *
 * Mirrors the auth shape of `../../clarisa.connection.ts` (POST auth/login with
 * `{ login, password }`, then a bearer-token GET) without importing it — that class
 * requires Nest's HttpService and cannot run outside the DI container.
 *
 * Two different derivations from ONE fetch — do not confuse them:
 *   - the dictionary is derived from the FULL live response (every project, every
 *     mapping); all 13 SP codes only exist across the whole payload.
 *   - the reference capture is a trimmed subset of that same response, built AFTER
 *     the dictionary, for shape/key-set purposes only.
 *
 * Removal condition (verbatim — T-07 greps for this exact string in three places):
 * when CLARISA publishes external_code and phase-2026 data, unset the flag and
 * delete the stub, fixture, dictionary, reference capture and converter; do not
 * maintain them
 */
import 'dotenv/config';
import { writeFileSync } from 'fs';
import { join } from 'path';

const HOST = process.env.ARI_CLARISA_HOST;
const USER = process.env.ARI_CLARISA_USER;
const PASS = process.env.ARI_CLARISA_PASS;

const FIXTURES_DIR = join(__dirname, '..', 'fixtures');
const REFERENCE_CAPTURE_PATH = join(
  FIXTURES_DIR,
  'clarisa-reference-capture.json',
);
const DICTIONARY_PATH = join(
  FIXTURES_DIR,
  'clarisa-global-units.dictionary.json',
);
const PROVENANCE_PATH = join(FIXTURES_DIR, 'clarisa-projects.provenance.json');

// T-07 greps for this exact sentence in three places — do not paraphrase it here
// or anywhere else it is copied.
const REMOVAL_CONDITION =
  'when CLARISA publishes external_code and phase-2026 data, unset the flag and delete the stub, fixture, dictionary, reference capture and converter; do not maintain them';

const EXPECTED_MIN_DISTINCT_SMO_CODES = 13;

// Deterministic trimming rule (design §5.1 / task G): the first N projects, in
// response order, that carry at least one mapping. A re-run over the same
// payload always picks the same N projects.
const REFERENCE_CAPTURE_SIZE = 5;
const REFERENCE_CAPTURE_EXPECTED_KEY_COUNT = 32;

interface ClarisaProject {
  [key: string]: unknown;
  project_mappings_array?: ClarisaProjectMapping[];
}

interface ClarisaProjectMapping {
  global_unit_object?: {
    id?: unknown;
    smo_code?: string;
    cgiar_entity_type_object?: { code?: unknown };
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

function fail(message: string): never {
  // Never commit artifacts from a partial fetch (K-014) — abort loudly, write nothing.
  console.error(`[harvest-reference] ${message}`);
  console.error('[harvest-reference] Aborting; nothing written.');
  process.exit(1);
}

/**
 * Logs in to CLARISA. The live host answers a successful login with HTTP 201
 * (verified against the live host), never 200 — do not assert `=== 200` here.
 */
async function login(): Promise<string> {
  if (!HOST) fail('ARI_CLARISA_HOST is not set.');
  if (!USER || !PASS) {
    fail('ARI_CLARISA_USER / ARI_CLARISA_PASS are not set.');
  }

  const response = await fetch(`${HOST}auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ login: USER, password: PASS }),
  });

  console.log(`[harvest-reference] POST auth/login -> HTTP ${response.status}`);
  if (response.status !== 201) {
    fail(`Login failed: expected HTTP 201, got ${response.status}.`);
  }

  let body: { access_token?: unknown };
  try {
    body = await response.json();
  } catch (err) {
    fail(`Login response body could not be parsed as JSON: ${err}`);
  }

  if (typeof body.access_token !== 'string' || body.access_token.length === 0) {
    fail('Login response did not carry a non-empty access_token.');
  }

  return body.access_token;
}

/**
 * Fetches the FULL, untrimmed project list. Checks status and shape before
 * anything is counted (K-014) — a count over a failed or truncated fetch is a
 * confident zero.
 */
async function fetchProjects(token: string): Promise<ClarisaProject[]> {
  const response = await fetch(`${HOST}api/projects`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  console.log(
    `[harvest-reference] GET api/projects -> HTTP ${response.status}`,
  );
  if (response.status !== 200) {
    fail(`GET api/projects failed: expected HTTP 200, got ${response.status}.`);
  }

  let body: unknown;
  try {
    body = await response.json();
  } catch (err) {
    fail(
      `GET api/projects body could not be parsed as JSON (likely truncated): ${err}`,
    );
  }

  if (!Array.isArray(body)) {
    fail(`GET api/projects did not return an array (got ${typeof body}).`);
  }
  if (body.length === 0) {
    fail('GET api/projects returned an empty array.');
  }

  return body as ClarisaProject[];
}

interface DictionaryResult {
  dictionary: Record<string, unknown>;
  ambiguous: string[];
}

/**
 * Derives the dictionary from the FULL project list — never from a trimmed
 * subset. Asserts every `smo_code` maps to exactly one (id, entity-code) pair;
 * a future ambiguity fails loudly instead of silently picking a winner.
 */
function buildDictionary(projects: ClarisaProject[]): DictionaryResult {
  const pairsBySmoCode = new Map<string, Set<string>>();
  const globalUnitBySmoCode = new Map<string, unknown>();

  for (const project of projects) {
    const mappings = Array.isArray(project.project_mappings_array)
      ? project.project_mappings_array
      : [];

    for (const mapping of mappings) {
      const globalUnitObject = mapping?.global_unit_object;
      const smoCode = globalUnitObject?.smo_code;
      if (!smoCode || !globalUnitObject) continue;

      const id = globalUnitObject.id;
      const entityCode = globalUnitObject.cgiar_entity_type_object?.code;
      const pairKey = `${JSON.stringify(id)}::${JSON.stringify(entityCode)}`;

      const pairs = pairsBySmoCode.get(smoCode) ?? new Set<string>();
      pairs.add(pairKey);
      pairsBySmoCode.set(smoCode, pairs);

      if (!globalUnitBySmoCode.has(smoCode)) {
        // First-seen instance, copied verbatim — no reshaping, re-keying,
        // sorting, prettifying, or dropping nulls inside it (DD-2/R-CFS-002 AC.1).
        globalUnitBySmoCode.set(smoCode, globalUnitObject);
      }
    }
  }

  const ambiguous: string[] = [];
  const dictionary: Record<string, unknown> = {};

  for (const [smoCode, pairs] of pairsBySmoCode) {
    if (pairs.size > 1) {
      ambiguous.push(smoCode);
      continue;
    }
    dictionary[smoCode] = globalUnitBySmoCode.get(smoCode);
  }

  return { dictionary, ambiguous };
}

/**
 * Trims the ALREADY-BUILT-FROM-FULL-PAYLOAD project list down to a small,
 * diff-reviewable reference capture — deterministic by construction (task G).
 */
function buildReferenceCapture(
  projects: ClarisaProject[],
  size: number,
): ClarisaProject[] {
  const capture: ClarisaProject[] = [];
  for (const project of projects) {
    const mappings = Array.isArray(project.project_mappings_array)
      ? project.project_mappings_array
      : [];
    if (mappings.length === 0) continue;
    capture.push(project);
    if (capture.length === size) break;
  }
  return capture;
}

function assertKeyCount(projects: ClarisaProject[], expected: number): void {
  for (const [index, project] of projects.entries()) {
    const keys = Object.keys(project);
    if (keys.length !== expected) {
      fail(
        `Reference capture project at index ${index} has ${keys.length} keys, expected ${expected}. Keys: ${keys.join(', ')}`,
      );
    }
  }
}

function entityCodeHistogram(
  dictionary: Record<string, unknown>,
): Record<string, number> {
  const histogram: Record<string, number> = {};
  for (const smoCode of Object.keys(dictionary)) {
    const entry = dictionary[smoCode] as {
      cgiar_entity_type_object?: { code?: unknown };
    };
    const code = String(entry?.cgiar_entity_type_object?.code);
    histogram[code] = (histogram[code] ?? 0) + 1;
  }
  return histogram;
}

async function main(): Promise<void> {
  const token = await login();
  const projects = await fetchProjects(token);
  console.log(
    `[harvest-reference] Fetched ${projects.length} projects (full payload).`,
  );

  // Dictionary FIRST, from the full payload — trimming before this step would
  // lose SP codes that only appear later in the response.
  const { dictionary, ambiguous } = buildDictionary(projects);

  if (ambiguous.length > 0) {
    fail(
      `Ambiguous smo_code -> (id, entity-code) mapping for: ${ambiguous.join(', ')}. Refusing to pick a winner.`,
    );
  }

  const distinctCodes = Object.keys(dictionary).sort();
  console.log(
    `[harvest-reference] Distinct smo_code count: ${distinctCodes.length} (${distinctCodes.join(', ')})`,
  );

  if (distinctCodes.length < EXPECTED_MIN_DISTINCT_SMO_CODES) {
    fail(
      `Only ${distinctCodes.length} distinct smo_codes found, expected at least ${EXPECTED_MIN_DISTINCT_SMO_CODES}. The dictionary is incomplete, not empty — a partial fetch must not be committed.`,
    );
  }

  const histogram = entityCodeHistogram(dictionary);
  console.log('[harvest-reference] Entity-code histogram:', histogram);

  // Trim AFTER the dictionary is built.
  const referenceCapture = buildReferenceCapture(
    projects,
    REFERENCE_CAPTURE_SIZE,
  );
  assertKeyCount(referenceCapture, REFERENCE_CAPTURE_EXPECTED_KEY_COUNT);
  console.log(
    `[harvest-reference] Reference capture: ${referenceCapture.length} projects, each with ${REFERENCE_CAPTURE_EXPECTED_KEY_COUNT} keys.`,
  );

  writeFileSync(
    REFERENCE_CAPTURE_PATH,
    JSON.stringify(referenceCapture, null, 2) + '\n',
  );
  writeFileSync(DICTIONARY_PATH, JSON.stringify(dictionary, null, 2) + '\n');

  const capturedAt = new Date().toISOString();
  const provenance = {
    // T-02/T-03 add an `export` block and expected counts alongside this one —
    // this file is not rewritten to make room for them.
    capture: {
      host: HOST,
      captured_at: capturedAt,
      fetched_project_count: projects.length,
      reference_capture_project_count: referenceCapture.length,
      reference_capture_selection_rule:
        'first N projects, in response order, carrying >=1 mapping (N=' +
        REFERENCE_CAPTURE_SIZE +
        ')',
      dictionary_entry_count: distinctCodes.length,
      dictionary_entity_code_histogram: histogram,
    },
    removal_condition: REMOVAL_CONDITION,
  };
  writeFileSync(PROVENANCE_PATH, JSON.stringify(provenance, null, 2) + '\n');

  console.log(
    `[harvest-reference] Wrote:\n  ${REFERENCE_CAPTURE_PATH}\n  ${DICTIONARY_PATH}\n  ${PROVENANCE_PATH}`,
  );
}

// Exported so the K-004 falsifier can drive this module's real ambiguity
// check with a synthetic payload, instead of reimplementing the logic
// alongside it and proving nothing about the shipped code.
export { buildDictionary };
export type { ClarisaProject };

// Only run the live harvest when executed directly (`ts-node harvest-reference.ts`),
// not when required by the falsifier script above.
if (require.main === module) {
  main().catch((err) => {
    fail(
      `Unhandled error: ${err instanceof Error ? (err.stack ?? err.message) : err}`,
    );
  });
}
