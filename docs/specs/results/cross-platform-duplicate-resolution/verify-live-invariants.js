/**
 * T-14 — Live-data invariant check. A MANUAL pre-`apply` gate, not CI.
 *
 * Asserts the five properties that are facts about DATA (and, for 2b, about
 * two systems agreeing), which no unit test can establish. Each one exists
 * because a specific defect class in this spec's history was invisible to the
 * suite:
 *
 *   1  Cross-platform matchability PER PLATFORM (R-RES-001 AC.7 / DC-9).
 *      NOT a non-emptiness check: under rev 2, PRMS `public_link` was
 *      non-empty for 3,947/3,947 rows and matched nothing. Intersection is
 *      the weakest assertion that actually fails on the rev-2 corpus.
 *   2  Role/privacy invariant on PRMS evidence — guards the STORED-side
 *      predicate (R-RES-010 AC.3) the sweep relies on.
 *   2b Stored-vs-incoming handle AGREEMENT (rev 4). The stored side reads a
 *      `result_evidences` ROW; the incoming side reads a payload SCALAR.
 *      Whether they name the same handle for the same result is a fact about
 *      two systems, so this assertion is the only one that leaves the
 *      database.
 *   3  KP handle 1:1 in BOTH directions. The reverse direction has no branch
 *      protecting it: in {PRMS_A, PRMS_B, TIP} the survivor is TIP, Gate A
 *      protects neither PRMS row, and BOTH are hard-deleted (JD3-S-09).
 *   4  Title agreement across PRMS<->counterpart pairs — the ownership
 *      corroboration behind A6, with the disagreeing pairs listed as DC-10's
 *      residual review population.
 *   5  DC-2's post-run verification query: zero groups classified `RESOLVED`
 *      that still have a stored loser. Carried here from T-15 (2026-08-05)
 *      because it is a post-run check against a populated database.
 *
 * ## Two traps this script is built to avoid, both load-bearing
 *
 * **It reads the SHIPPED identity, never a re-derivation.** The whole
 * `identity_candidates` / `identity_counted` CTE is pulled off
 * `DuplicateCandidateRepository` at runtime. A gate that re-states the
 * identity in its own SQL can drift from the code it gates and then pass
 * while production reads a different field — which is DC-9 wearing the
 * gate's own clothes. Nothing here re-implements the identity.
 *
 * **Assertion 5 must be able to FAIL.** Written over `public_link` it would
 * return zero for PRMS by construction, recreating DC-9 inside DC-2's own
 * gate; and asserting "zero unresolved cross-platform groups" could only
 * ever fail, and a gate that can only fail is a gate that gets waived
 * (`requirements.md` §3.0, DC-2). So it is written over the R-RES-010
 * identity, it is scoped to RESOLVED groups only, and it carries a NEGATIVE
 * CONTROL: the same query run over a DRY_RUN, where every planned loser is
 * still stored by definition, MUST return a non-zero count. A control that
 * returns zero means the query cannot see a surviving loser and the
 * assertion is worthless, whatever it reports.
 *
 * READ-ONLY. Only SELECT against MySQL; only GET against the PRMS searcher
 * (the same URL and parameters the sync itself calls). No DDL, no DML.
 * Prints no credentials.
 *
 * Run from `server/researchindicators` (it reads that package's .env and
 * node_modules):
 *
 *   node -r ts-node/register/transpile-only \
 *     ../../docs/specs/results/cross-platform-duplicate-resolution/verify-live-invariants.js
 *
 * Do NOT copy `run-dry-run.ts`'s documented `npx ts-node -T` invocation — it
 * does not work (no root tsconfig.json, so TypeORM's decorators compile under
 * the TC39 transform and `auditable.entity.ts` throws). This script uses
 * `verify-normalization.js`'s `module.paths` shim instead, which needs no
 * NODE_PATH or TS_NODE_PROJECT.
 *
 * Exit codes — INCONCLUSIVE is deliberately NOT a pass:
 *   0  all five assertions PASS
 *   1  at least one assertion FAILED
 *   3  at least one assertion is INCONCLUSIVE (unreachable/empty corpus,
 *      no APPLY run yet, or a baseline spread with no explained data change)
 *   2  fatal — could not run at all
 */
const path = require('path');

// This script lives outside the server package, so resolve that package's
// dependencies explicitly rather than relying on NODE_PATH.
module.paths.unshift(path.join(process.cwd(), 'node_modules'));

require('dotenv').config();
const mp = require('mysql2/promise');

const SERVER_SRC = path.join(process.cwd(), 'src');
const {
  DuplicateCandidateRepository,
} = require(
  path.join(
    SERVER_SRC,
    'domain/entities/results/repositories/duplicate-candidate.repository.ts',
  ),
);
const {
  normalizeIdentityCandidate,
  isHandleFormatIdentity,
} = require(path.join(SERVER_SRC, 'domain/shared/utils/publication-identity.util.ts'));

/**
 * The shipped identity CTE, lifted off the repository rather than restated.
 * `identityCandidatesCte` is `private static` in TypeScript only — at runtime
 * it is an ordinary static, and reaching it is the point: this gate must
 * assert over the SAME SQL the sweep and the sync path execute.
 */
const IDENTITY_CTE = DuplicateCandidateRepository['identityCandidatesCte']();

/** Baselines from design.md §0.5 / §14, measured 2026-08-05. */
const BASELINE = {
  prmsEvidenceRows: 4535,
  kpResults: 2387,
  titleAgreementPairs: 2266,
  titleAgreementRate: 0.951,
  /**
   * Live KP items on the searcher.
   *
   * **NOT 277.** design §0.5 / T-13 / T-14 all record "277/277 live KP items
   * carry `knowledge_product_summary.handle`", and that figure is a SAMPLE
   * taken during T-13's rev-4 observation, not the population — it was never
   * labelled as one. Measured over the FULL searcher corpus 2026-08-05 with
   * the sync's own parameters: 5,180 items, of which **2,388 are KP and 2,387
   * carry a handle**. The corpus did not change; the earlier number was a
   * partial read. It reconciles: 2,387 incoming handles against exactly 2,387
   * stored KP handle identities.
   */
  incomingKpItems: 2388,
  /** Relative spread beyond which a rate difference is reported, not passed. */
  materialSpread: 0.05,
};

const PLATFORMS_IN_SCOPE = ['TIP', 'AICCRA', 'PRMS'];

const results = [];
const record = (id, label, verdict, detail) => {
  results.push({ id, label, verdict, detail });
  const tag =
    verdict === 'PASS' ? 'ok  ' : verdict === 'FAIL' ? 'FAIL' : '????';
  console.log(`\n${tag} [${id}] ${label}`);
  if (detail) console.log(detail.replace(/^/gm, '       '));
};

/**
 * Percentage, with enough precision that a near-miss cannot round to a clean
 * number: 2386/2387 must read `99.96%`, never `100.0%`. On a gate whose whole
 * job is to surface a single divergent row among thousands, a rounding that
 * displays perfection is a way to be told the wrong thing.
 */
const pct = (n, d) => {
  if (d === 0) return '—';
  const value = (n / d) * 100;
  const decimals = n !== d && value > 99.9 ? 2 : 1;
  return `${value.toFixed(decimals)}%`;
};

/** Relative difference against a baseline, for the "report the spread" rule. */
const spread = (observed, baseline) =>
  baseline === 0 ? 0 : Math.abs(observed - baseline) / baseline;

// ---------------------------------------------------------------------------

async function fetchIdentitySet(conn) {
  // One fetch feeds assertions 1, 2b, 3 and 4. Deliberate: the T-15 dry-run
  // measured this workload as round-trip-latency-bound (~33 min for thousands
  // of short queries over the VPN, with zero long-running queries in
  // PROCESSLIST), so the cost here is the number of round trips, not the rows.
  const [rows] = await conn.query(
    `WITH ${IDENTITY_CTE}
     SELECT ic.resultId, ic.resultOfficialCode, ic.platformCode, ic.indicatorId,
            ic.reportYearId, ic.rawIdentity, ic.identitySource,
            ic.normalizedPublicLink, ic.identityCount, r.title
     FROM identity_counted ic
     INNER JOIN results r ON r.result_id = ic.resultId`,
  );
  return rows;
}

// --- 1: per-platform cross-platform matchability (R-RES-001 AC.7 / DC-9) ---
function assertMatchability(identities) {
  const byPlatform = new Map();
  const platformsByIdentity = new Map();

  for (const row of identities) {
    if (!byPlatform.has(row.platformCode)) {
      byPlatform.set(row.platformCode, {
        results: new Set(),
        identities: new Set(),
        sources: new Map(),
      });
    }
    const p = byPlatform.get(row.platformCode);
    p.results.add(row.resultId);
    p.identities.add(row.normalizedPublicLink);
    p.sources.set(row.identitySource, (p.sources.get(row.identitySource) ?? 0) + 1);

    if (!platformsByIdentity.has(row.normalizedPublicLink)) {
      platformsByIdentity.set(row.normalizedPublicLink, new Set());
    }
    platformsByIdentity.get(row.normalizedPublicLink).add(row.platformCode);
  }

  const lines = [];
  const faults = [];

  for (const platform of PLATFORMS_IN_SCOPE) {
    const p = byPlatform.get(platform);
    if (!p) {
      faults.push(`${platform}: contributes ZERO identities — DC-9 signal`);
      lines.push(`${platform.padEnd(7)} results=0      identities=0      intersecting=0      (ABSENT)`);
      continue;
    }
    let intersecting = 0;
    for (const identity of p.identities) {
      const platforms = platformsByIdentity.get(identity);
      if (platforms.size > 1) intersecting++;
    }
    const sources = [...p.sources.entries()]
      .map(([s, n]) => `${s}=${n}`)
      .join(' ');
    lines.push(
      `${platform.padEnd(7)} results=${String(p.results.size).padEnd(6)} ` +
        `identities=${String(p.identities.size).padEnd(6)} ` +
        `intersecting=${String(intersecting).padEnd(6)} ` +
        `(${pct(intersecting, p.identities.size)})  ${sources}`,
    );
    if (p.identities.size === 0) {
      faults.push(`${platform}: contributes ZERO identities — DC-9 signal`);
    } else if (intersecting === 0) {
      faults.push(
        `${platform}: ${p.identities.size} identities, NONE of which intersect any ` +
          `other platform — this is the rev-2 PRMS shape and MUST be reported as a ` +
          `fault, never read as "no duplicates"`,
      );
    }
  }

  const extra = [...byPlatform.keys()].filter(
    (p) => !PLATFORMS_IN_SCOPE.includes(p),
  );
  if (extra.length) {
    lines.push(`\nNOT in the declared scope but present in the identity set: ${extra.join(', ')}`);
    lines.push('A new platform reaching the identity CTE changes the deletion population — investigate before `apply`.');
  }

  record(
    'A1',
    'Cross-platform matchability, per platform (R-RES-001 AC.7 / DC-9)',
    faults.length ? 'FAIL' : 'PASS',
    [...lines, ...(faults.length ? ['', ...faults.map((f) => `FAULT: ${f}`)] : [])].join('\n'),
  );

  return { byPlatform, platformsByIdentity };
}

// --- 2: role/privacy invariant on PRMS evidence (R-RES-010 AC.3) -----------
async function assertRolePrivacy(conn) {
  const [rows] = await conn.query(
    `SELECT COUNT(*) AS total,
            SUM(e.evidence_role_id <> 1) AS notPrincipal,
            SUM(COALESCE(e.is_private, FALSE) <> FALSE) AS privateRows,
            SUM(COALESCE(e.is_active, TRUE) = FALSE) AS inactiveRows
     FROM result_evidences e
     INNER JOIN results r ON r.result_id = e.result_id
     WHERE r.platform_code = 'PRMS'`,
  );
  const r = rows[0];
  const total = Number(r.total);
  const notPrincipal = Number(r.notPrincipal ?? 0);
  const privateRows = Number(r.privateRows ?? 0);
  const inactiveRows = Number(r.inactiveRows ?? 0);

  const lines = [
    `PRMS evidence rows: ${total}  (baseline ${BASELINE.prmsEvidenceRows})`,
    `evidence_role_id <> 1 (PRINCIPAL_EVIDENCE): ${notPrincipal}   [must be 0]`,
    `is_private = TRUE:                          ${privateRows}   [must be 0]`,
    `is_active  = FALSE:                         ${inactiveRows}   [reported, not asserted]`,
  ];

  if (total === 0) {
    record('A2', 'PRMS evidence role/privacy invariant (R-RES-010 AC.3)', 'INCONCLUSIVE',
      [...lines, '', 'Zero PRMS evidence rows — this is not the corpus the baselines describe.'].join('\n'));
    return;
  }

  const ok = notPrincipal === 0 && privateRows === 0;
  lines.push(
    '',
    ok
      ? 'Both predicates are no-ops against today\'s data, as design §0.5 measured. They are'
      : 'A predicate that was a no-op has started FILTERING. The stored-side identity',
    ok
      ? 'still written, because a future writer may use them — but the handle-format filter'
      : 'population just shrank silently, which is under-detection (DC-2), not over-deletion.',
    ok ? 'remains the only load-bearing predicate.' : 'Re-measure the stored corpus before `apply`.',
  );

  record('A2', 'PRMS evidence role/privacy invariant (R-RES-010 AC.3)', ok ? 'PASS' : 'FAIL',
    lines.join('\n'));
}

// --- 2b: stored-vs-incoming handle agreement (rev 4) -----------------------
async function assertHandleAgreement(identities) {
  const base = process.env.ARI_SEARCH_PRMS_URL;
  if (!base) {
    record('A2b', 'Stored-vs-incoming handle agreement (design §3.1.1)', 'INCONCLUSIVE',
      'ARI_SEARCH_PRMS_URL is not set — the incoming side cannot be read.');
    return;
  }

  // The SAME parameters `PrmsOpenSearchService.runPrmsSync` calls with. A
  // different filter would compare a different population and the agreement
  // rate would be a number about nothing.
  const centerAcronym = ['ABC', 'ABC RH'];
  // 500, not 1000: at size=1000 the searcher returns a REPRODUCIBLE HTTP 500
  // on page 5 (measured 2026-08-05 — four consecutive attempts, same page,
  // same failure), so the large page size silently caps the corpus at ~4,000
  // of 5,180 items. At 500 all 11 pages serve. This is a server-side limit,
  // not a cold start; the retry below covers genuine transients only. The
  // sync itself uses size=50, which is safely inside the limit.
  const size = 500;
  const items = [];
  let page = 1;
  let totalPages = 1;

  // The searcher is a Lambda behind API Gateway and returns a transient 500
  // on a cold start (observed 2026-08-05 while authoring this: one page 500'd,
  // every page served on the immediate retry). Without a retry a cold start
  // turns this gate INCONCLUSIVE for a reason that has nothing to do with the
  // data — a false negative on a gate is how a real signal gets ignored.
  const fetchPage = async (url, attempt = 1) => {
    const response = await fetch(url);
    if (response.ok) return response.json();
    if (attempt >= 4) throw new Error(`searcher HTTP ${response.status} after ${attempt} attempts`);
    await new Promise((resolve) => setTimeout(resolve, 1000 * attempt));
    return fetchPage(url, attempt + 1);
  };

  try {
    do {
      const url =
        `${base}/result?size=${size}&page=${page}` +
        `&fundingType=Result&centerAcronym=${encodeURIComponent(centerAcronym.join(','))}`;
      const body = await fetchPage(url);
      totalPages = body.totalPages ?? 1;
      items.push(...(body.data ?? []));
      page++;
    } while (page <= totalPages);
  } catch (error) {
    record('A2b', 'Stored-vs-incoming handle agreement (design §3.1.1)', 'INCONCLUSIVE',
      `Could not read the PRMS searcher: ${error.message}`);
    return;
  }

  // KP is `indicator_category.code = 6` on the PAYLOAD (`ResultTypeEnum`) —
  // NOT 3, which is ARI's post-homologation `IndicatorsEnum` value. Getting
  // this constant wrong measures nothing and looks like success; it already
  // happened once during the rev-4 investigation.
  const kpItems = items.filter(
    (item) => String(item?.indicator_category?.code) === '6',
  );

  // Stored PRMS handle identities, keyed the way the sync looks a row up.
  const stored = new Map();
  for (const row of identities) {
    if (row.platformCode !== 'PRMS') continue;
    if (row.identitySource !== 'HANDLE_EVIDENCE') continue;
    const key = `${row.resultOfficialCode}::${row.reportYearId}`;
    if (!stored.has(key)) stored.set(key, []);
    stored.get(key).push(row.normalizedPublicLink);
  }

  let agree = 0;
  let disagree = 0;
  let incomingNoHandle = 0;
  let noStoredCounterpart = 0;
  const disagreements = [];

  for (const item of kpItems) {
    const rawHandle = item?.knowledge_product_summary?.handle;
    if (!isHandleFormatIdentity(rawHandle)) {
      incomingNoHandle++;
      continue;
    }
    const incoming = normalizeIdentityCandidate(rawHandle);
    const key = `${item.result_code}::${item.year}`;
    const storedHandles = stored.get(key);
    if (!storedHandles || storedHandles.length === 0) {
      noStoredCounterpart++;
      continue;
    }
    if (storedHandles.includes(incoming)) {
      agree++;
    } else {
      disagree++;
      if (disagreements.length < 25) {
        disagreements.push(
          `  code=${item.result_code} year=${item.year}  incoming="${incoming}"  stored="${storedHandles.join('", "')}"`,
        );
      }
    }
  }

  const compared = agree + disagree;
  const lines = [
    `searcher items fetched: ${items.length} over ${totalPages} page(s)`,
    `KP items (indicator_category.code = 6): ${kpItems.length}  (baseline ${BASELINE.incomingKpItems})`,
    `KP items carrying a handle-format knowledge_product_summary.handle: ${kpItems.length - incomingNoHandle}`,
    `KP items with no handle: ${incomingNoHandle}`,
    '',
    `comparable pairs (incoming handle AND a stored handle identity): ${compared}`,
    `  agree:    ${agree}  (${pct(agree, compared)})   [baseline 277/277]`,
    `  DISAGREE: ${disagree}   [must be 0]`,
    `KP items with an incoming handle but NO stored handle identity: ${noStoredCounterpart}`,
  ];

  if (noStoredCounterpart > 0) {
    lines.push(
      '',
      'The stored corpus is STATIC by construction (design §0.5: a single nine-minute bulk',
      'migration on 2026-07-23; no code on the PRMS sync path writes result_evidences). So a',
      'growing "no stored identity" count is EXPECTED drift, not a defect — those rows are',
      'invisible to the sweep and visible only to the sync path. It is reported, not asserted.',
      'The decision to leave it that way lives in OQ-12.',
    );
  }

  if (compared === 0) {
    record('A2b', 'Stored-vs-incoming handle agreement (design §3.1.1)', 'INCONCLUSIVE',
      [...lines, '', 'Zero comparable pairs — the agreement property was not exercised at all.'].join('\n'));
    return;
  }

  if (disagree > 0) {
    lines.push('', 'DISAGREEING PAIRS (first 25):', ...disagreements);
    lines.push(
      '',
      'A disagreement means the sweep would delete on one handle while the next sync resolves',
      'on another — the row survives detection and DC-2 recurs on live data.',
    );
  }

  const kpSpread = spread(kpItems.length, BASELINE.incomingKpItems);
  let verdict = disagree === 0 ? 'PASS' : 'FAIL';
  if (verdict === 'PASS' && kpSpread > BASELINE.materialSpread) {
    lines.push(
      '',
      `NOTE: the KP item count differs from the §0.5 baseline by ${(kpSpread * 100).toFixed(0)}%.`,
      'Agreement itself is clean, so this is reported rather than failed — but per the task\'s',
      '"what disqualifies the evidence" rule, a material spread with no explained data change',
      'must be understood before `apply`, not recorded as a pass because the process exited 0.',
    );
    verdict = 'INCONCLUSIVE';
  }

  record('A2b', 'Stored-vs-incoming handle agreement (design §3.1.1)', verdict, lines.join('\n'));
}

// --- 3: KP handle 1:1 in BOTH directions (JD3-S-09) -----------------------
function assertOneToOne(identities) {
  const prmsKp = identities.filter(
    (row) => row.platformCode === 'PRMS' && row.identitySource === 'HANDLE_EVIDENCE',
  );

  const handlesByResult = new Map();
  const resultsByHandle = new Map();
  for (const row of prmsKp) {
    if (!handlesByResult.has(row.resultId)) handlesByResult.set(row.resultId, new Set());
    handlesByResult.get(row.resultId).add(row.normalizedPublicLink);
    if (!resultsByHandle.has(row.normalizedPublicLink)) {
      resultsByHandle.set(row.normalizedPublicLink, new Set());
    }
    resultsByHandle.get(row.normalizedPublicLink).add(row.resultId);
  }

  const multiHandle = [...handlesByResult.entries()].filter(([, s]) => s.size > 1);
  const multiResult = [...resultsByHandle.entries()].filter(([, s]) => s.size > 1);

  // `identityCount` is what `refuseMultiIdentityLosers` actually reads. If it
  // disagrees with the set computed here, the refusal is keyed off a number
  // that does not describe the data — assert the projection, not just the data.
  const countMismatch = prmsKp.filter(
    (row) => Number(row.identityCount) !== handlesByResult.get(row.resultId).size,
  );

  const lines = [
    `PRMS KP results with a handle identity: ${handlesByResult.size}  (baseline ${BASELINE.kpResults})`,
    `distinct handles:                       ${resultsByHandle.size}  (baseline ${BASELINE.kpResults})`,
    '',
    `forward  — results with >1 handle: ${multiHandle.length}   [must be 0]`,
    `REVERSE  — handles with >1 result: ${multiResult.length}   [must be 0]`,
    `identityCount projection disagreeing with the observed set: ${countMismatch.length}   [must be 0]`,
  ];

  if (multiResult.length) {
    lines.push(
      '',
      'The reverse direction has NO branch protecting it. In {PRMS_A, PRMS_B, TIP} the survivor',
      'is TIP, Gate A protects neither PRMS row because neither shares a platform with the',
      'survivor, and BOTH are hard-deleted. If the shared handle is a data error, a distinct',
      'publication is destroyed. Offending handles (first 10):',
      ...multiResult.slice(0, 10).map(([h, s]) => `  "${h}" -> results ${[...s].join(', ')}`),
    );
  }
  if (multiHandle.length) {
    lines.push(
      '',
      'Forward violations break the partition assumption the pairwise resolver (§5.1) was',
      'designed against. Offending results (first 10):',
      ...multiHandle.slice(0, 10).map(([id, s]) => `  result ${id} -> ${[...s].join(', ')}`),
    );
  }

  if (handlesByResult.size === 0) {
    record('A3', 'KP handle 1:1 in BOTH directions (JD3-S-09)', 'INCONCLUSIVE',
      [...lines, '', 'Zero PRMS KP handle identities — nothing to assert.'].join('\n'));
    return;
  }

  const ok = multiHandle.length === 0 && multiResult.length === 0 && countMismatch.length === 0;
  record('A3', 'KP handle 1:1 in BOTH directions (JD3-S-09)', ok ? 'PASS' : 'FAIL', lines.join('\n'));
}

// --- 4: title agreement across PRMS<->counterpart pairs (A6 / DC-10) -------
function assertTitleAgreement(identities) {
  const byIdentity = new Map();
  for (const row of identities) {
    if (!byIdentity.has(row.normalizedPublicLink)) byIdentity.set(row.normalizedPublicLink, []);
    byIdentity.get(row.normalizedPublicLink).push(row);
  }

  // TWO rates, deliberately. The §0.5 baseline (2,156/2,266 = 95.1%) was
  // measured with an EXACT title comparison. Reporting only a
  // whitespace/case-folded rate here would show ~98.6% and read as a 3.5-point
  // improvement in ownership corroboration when nothing about the data
  // changed — the metric would have moved, not the corpus. The exact rate is
  // what the baseline and the §14 tripwire are compared against; the folded
  // rate is reported beside it because a pair differing only in case or
  // whitespace is not a DC-10 ownership signal and should not sit in the
  // human review population.
  const exact = (t) => (t ?? '').trim();
  const folded = (t) => (t ?? '').trim().replace(/\s+/g, ' ').toLowerCase();

  let agreeExact = 0;
  let agreeFolded = 0;
  const disagreeing = [];

  for (const [, rows] of byIdentity) {
    const prms = rows.filter((r) => r.platformCode === 'PRMS');
    const others = rows.filter((r) => r.platformCode !== 'PRMS');
    for (const p of prms) {
      for (const o of others) {
        if (exact(p.title) && exact(p.title) === exact(o.title)) agreeExact++;
        if (folded(p.title) && folded(p.title) === folded(o.title)) agreeFolded++;
        else disagreeing.push({ prms: p, other: o });
      }
    }
  }

  const pairs = agreeFolded + disagreeing.length;
  const rate = pairs === 0 ? 0 : agreeExact / pairs;
  const lines = [
    `PRMS<->counterpart pairs: ${pairs}  (baseline ${BASELINE.titleAgreementPairs})`,
    `identical title, EXACT:   ${agreeExact}  (${pct(agreeExact, pairs)})  <- the baseline metric (${(BASELINE.titleAgreementRate * 100).toFixed(1)}%)`,
    `identical title, folded:  ${agreeFolded}  (${pct(agreeFolded, pairs)})  (case + whitespace folded; reported, not the gate)`,
    `disagreeing (folded):     ${disagreeing.length}  — DC-10's residual review population`,
  ];

  if (pairs === 0) {
    record('A4', 'Title agreement, PRMS<->counterpart (A6 / DC-10)', 'INCONCLUSIVE',
      [...lines, '', 'Zero cross-platform pairs — the ownership corroboration was not exercised.'].join('\n'));
    return;
  }

  lines.push('', 'DISAGREEING PAIRS (first 40 — this is the list a human reviews before `apply`):');
  for (const d of disagreeing.slice(0, 40)) {
    lines.push(
      `  PRMS ${d.prms.resultId} (code ${d.prms.resultOfficialCode}, yr ${d.prms.reportYearId})  "${(d.prms.title ?? '').slice(0, 90)}"`,
      `  ${d.other.platformCode} ${d.other.resultId} (code ${d.other.resultOfficialCode}, yr ${d.other.reportYearId})  "${(d.other.title ?? '').slice(0, 90)}"`,
      `  handle: ${d.prms.normalizedPublicLink}`,
      '',
    );
  }
  if (disagreeing.length > 40) {
    lines.push(`  … and ${disagreeing.length - 40} more. The FULL list must reach the reviewer, not this truncation.`);
  }

  // §14: "materially below 95%" is the tripwire — a rise means citations are
  // entering the identity set, which is DC-10 arriving.
  const below = rate < BASELINE.titleAgreementRate - BASELINE.materialSpread;
  if (below) {
    lines.push(
      '',
      `Agreement is materially below the ${(BASELINE.titleAgreementRate * 100).toFixed(1)}% baseline. The ownership corroboration behind A6`,
      'is weakening and DC-10\'s residual is growing — citations may be entering the identity set.',
    );
  }

  record('A4', 'Title agreement, PRMS<->counterpart (A6 / DC-10)', below ? 'FAIL' : 'PASS',
    lines.join('\n'));
}

// --- 5: DC-2 post-run verification, with its negative control -------------
async function assertNoSurvivingLosers(conn, identities) {
  const liveIdentityByResult = new Map();
  for (const row of identities) {
    if (!liveIdentityByResult.has(row.resultId)) liveIdentityByResult.set(row.resultId, new Set());
    liveIdentityByResult.get(row.resultId).add(row.normalizedPublicLink);
  }

  const [runs] = await conn.query(
    // `groups` is reserved in MySQL 8 (the GROUPS window frame unit), so the
    // alias is backticked. Unquoted it is a parse error, not a wrong result.
    `SELECT run_id, mode, MAX(created_at) AS at, COUNT(*) AS \`groups\`
     FROM result_duplicate_resolution_log
     GROUP BY run_id, mode
     ORDER BY at DESC`,
  );

  const latestOf = (mode) => runs.find((r) => r.mode === mode);

  /**
   * A "surviving loser" is a participant that (a) is not the winner, (b) was
   * marked as one the run intended to remove, and (c) STILL carries a live
   * identity under the group's own key. Condition (c) is written over the
   * R-RES-010 identity rather than `public_link` on purpose: over
   * `public_link` it would return zero for PRMS by construction, recreating
   * DC-9 inside DC-2's own gate.
   *
   * PROTECTED / REFUSED / FAILED are deliberate retentions, not
   * under-deletion, so they are counted and reported separately — folding
   * them in would make the assertion fail on correct behaviour.
   */
  const scan = async (run, intendedOutcomes) => {
    const [rows] = await conn.query(
      `SELECT run_id, classification, winner_result_id, normalized_public_link,
              participants, outcomes
       FROM result_duplicate_resolution_log
       WHERE run_id = ? AND classification = 'RESOLVED'`,
      [run.run_id],
    );
    const surviving = [];
    let deliberate = 0;
    let gone = 0;
    for (const group of rows) {
      const participants = group.participants ?? [];
      const outcomes = group.outcomes ?? [];
      const outcomeOf = new Map(outcomes.map((o) => [Number(o.resultId), o.outcome]));
      for (const participant of participants) {
        const id = Number(participant.resultId);
        if (!Number.isFinite(id)) continue;
        if (Number(group.winner_result_id) === id) continue;
        const outcome = outcomeOf.get(id);
        if (!intendedOutcomes.includes(outcome)) {
          if (outcome) deliberate++;
          continue;
        }
        const live = liveIdentityByResult.get(id);
        if (live && live.has(group.normalized_public_link)) {
          surviving.push({ runId: group.run_id, resultId: id, outcome, key: group.normalized_public_link });
        } else {
          gone++;
        }
      }
    }
    return { groups: rows.length, surviving, deliberate, gone };
  };

  const lines = [`runs in the audit log: ${runs.map((r) => `${r.mode}×${r.groups}`).join('  ')}`];

  // --- negative control, FIRST: an assertion that cannot fail is worthless ---
  // The LARGEST dry run, not the latest: the control's job is to demonstrate
  // detection, and a run holding one group demonstrates almost nothing. The
  // 2,359-group sweep is the corpus this gate is really about.
  const control = runs
    .filter((r) => r.mode === 'DRY_RUN')
    .sort((a, b) => Number(b.groups) - Number(a.groups))[0];
  let controlOk = false;
  if (!control) {
    lines.push('', 'NEGATIVE CONTROL: no DRY_RUN in the log — the query\'s ability to detect a surviving loser is UNPROVEN.');
  } else {
    const c = await scan(control, ['PLANNED', 'DELETED']);
    controlOk = c.surviving.length > 0;
    lines.push(
      '',
      `NEGATIVE CONTROL — latest DRY_RUN ${control.run_id} (${c.groups} RESOLVED groups):`,
      `  planned losers still stored: ${c.surviving.length}   [MUST be > 0]`,
      controlOk
        ? '  The query can see a surviving loser. A dry run deletes nothing, so every planned loser'
        : '  The query returned ZERO on a run that deleted NOTHING. It cannot see a surviving loser,',
      controlOk
        ? '  is still stored by definition — detecting them is what proves the assertion below is real.'
        : '  so the assertion below is zero by construction and means nothing. Do NOT trust it.',
    );
  }

  // --- the assertion itself ---
  const applyRun = latestOf('APPLY');
  if (!applyRun) {
    lines.push(
      '',
      'ASSERTION: no APPLY run exists in the audit log yet, so there is no post-run state to verify.',
      'DC-2 is a POST-run check; it is re-run after the first `apply` and is not satisfiable before one.',
      controlOk
        ? 'The query is authored and its detection ability is PROVEN by the control above.'
        : 'The query is authored but its detection ability is NOT proven — fix the control first.',
    );
    record('A5', 'DC-2 — no RESOLVED group retains a stored loser', 'INCONCLUSIVE', lines.join('\n'));
    return;
  }

  const a = await scan(applyRun, ['DELETED']);
  lines.push(
    '',
    `ASSERTION — latest APPLY ${applyRun.run_id} (${a.groups} RESOLVED groups):`,
    `  losers marked DELETED that still carry a live identity: ${a.surviving.length}   [must be 0]`,
    `  losers marked DELETED and genuinely gone:               ${a.gone}`,
    `  deliberate retentions (PROTECTED / REFUSED / FAILED / NOOP): ${a.deliberate}  — correct, not under-deletion`,
  );
  if (a.surviving.length) {
    lines.push(
      '',
      'A row recorded as DELETED that still resolves to its group key is DC-2: the audit log says the',
      'duplicate was removed and it was not. First 20:',
      ...a.surviving.slice(0, 20).map((s) => `  result ${s.resultId} outcome=${s.outcome} key="${s.key}"`),
    );
  }

  const verdict = !controlOk ? 'INCONCLUSIVE' : a.surviving.length === 0 ? 'PASS' : 'FAIL';
  if (!controlOk) {
    lines.push('', 'Reported INCONCLUSIVE rather than PASS: the negative control did not establish that this query can fail.');
  }
  record('A5', 'DC-2 — no RESOLVED group retains a stored loser', verdict, lines.join('\n'));
}

// ---------------------------------------------------------------------------

(async () => {
  const conn = await mp.createConnection({
    host: process.env.ARI_MYSQL_HOST,
    user: process.env.ARI_MYSQL_USER_NAME,
    password: process.env.ARI_MYSQL_USER_PASS,
    database: process.env.ARI_MYSQL_NAME,
    connectTimeout: 30000,
  });

  const [meta] = await conn.query('SELECT DATABASE() AS db, VERSION() AS version');
  console.log(`database: ${meta[0].db}  mysql: ${meta[0].version}`);
  console.log(`identity CTE lifted from DuplicateCandidateRepository: ${IDENTITY_CTE.length} chars`);

  const identities = await fetchIdentitySet(conn);
  console.log(`identity rows (one per result+identity): ${identities.length}`);

  if (identities.length === 0) {
    console.log('\nINCONCLUSIVE — the identity set is empty. This is not a populated corpus.');
    await conn.end();
    process.exit(3);
  }

  assertMatchability(identities);
  await assertRolePrivacy(conn);
  await assertHandleAgreement(identities);
  assertOneToOne(identities);
  assertTitleAgreement(identities);
  await assertNoSurvivingLosers(conn, identities);

  await conn.end();

  const failed = results.filter((r) => r.verdict === 'FAIL');
  const inconclusive = results.filter((r) => r.verdict === 'INCONCLUSIVE');
  console.log(`\n${'='.repeat(78)}`);
  for (const r of results) console.log(`${r.verdict.padEnd(13)} ${r.id}  ${r.label}`);
  console.log(
    `\n${results.length - failed.length - inconclusive.length} passed, ` +
      `${failed.length} failed, ${inconclusive.length} inconclusive`,
  );
  if (failed.length || inconclusive.length) {
    console.log('\nThis is a MANUAL pre-`apply` gate. An INCONCLUSIVE is NOT a pass, and this');
    console.log('script must never be described as CI coverage (JD3-S-08).');
  }
  process.exit(failed.length ? 1 : inconclusive.length ? 3 : 0);
})().catch((error) => {
  console.error(`FATAL: ${error.code || error.sqlMessage || error.message}`);
  console.error(error.stack);
  process.exit(2);
});
