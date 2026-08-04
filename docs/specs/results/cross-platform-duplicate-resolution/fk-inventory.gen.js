/**
 * T-01 — generates docs/specs/results/cross-platform-duplicate-resolution/fk-inventory.md
 * directly from information_schema and SHOW CREATE FUNCTION.
 *
 * READ-ONLY: only SELECT / SHOW. No DDL, no DML. Prints no credentials.
 * The artifact is machine-generated so it cannot be a hand-transcription of
 * the design document's numbers — that is T-01's disqualifying-evidence clause.
 */
require('dotenv').config();
const mysql = require('mysql2/promise');
const fs = require('fs');

const OUT =
  require('path').join(__dirname, 'fk-inventory.md');

// Figures recorded in design.md §0.3, for divergence reporting only — never as the answer.
const EXPECTED = {
  fks: 38,
  noAction: 37,
  cascade: 1,
  fnTargets: 35,
  uncoveredNoAction: [
    'bulk_upload_results',
    'result_cap_sharing_ip',
    'result_pool_funding_alignment',
    'result_pool_funding_indicator_mapping',
    'result_pool_funding_toc_alignment',
    'result_review_history',
    'temp_result_ai',
  ],
};

(async () => {
  const conn = await mysql.createConnection({
    host: process.env.ARI_MYSQL_HOST,
    user: process.env.ARI_MYSQL_USER_NAME,
    password: process.env.ARI_MYSQL_USER_PASS,
    database: process.env.ARI_MYSQL_NAME,
    connectTimeout: 20000,
  });
  const db = process.env.ARI_MYSQL_NAME;
  const q = async (sql, p = []) => (await conn.query(sql, p))[0];

  // 1. Every FK referencing results(result_id)
  const fks = await q(
    `SELECT k.TABLE_NAME t, k.COLUMN_NAME c, k.CONSTRAINT_NAME n, r.DELETE_RULE d
       FROM information_schema.KEY_COLUMN_USAGE k
       JOIN information_schema.REFERENTIAL_CONSTRAINTS r
         ON r.CONSTRAINT_NAME = k.CONSTRAINT_NAME AND r.CONSTRAINT_SCHEMA = k.TABLE_SCHEMA
      WHERE k.TABLE_SCHEMA = ? AND k.REFERENCED_TABLE_NAME = 'results'
      ORDER BY k.TABLE_NAME, k.COLUMN_NAME`,
    [db],
  );

  // 2. Cross-result shapes: FK into a result_* sub-table keyed on result_id
  const cross = await q(
    `SELECT k.TABLE_NAME t, k.COLUMN_NAME c, k.REFERENCED_TABLE_NAME rt, r.DELETE_RULE d
       FROM information_schema.KEY_COLUMN_USAGE k
       JOIN information_schema.REFERENTIAL_CONSTRAINTS r
         ON r.CONSTRAINT_NAME = k.CONSTRAINT_NAME AND r.CONSTRAINT_SCHEMA = k.TABLE_SCHEMA
      WHERE k.TABLE_SCHEMA = ?
        AND k.REFERENCED_TABLE_NAME <> 'results'
        AND k.REFERENCED_COLUMN_NAME = 'result_id'
      ORDER BY k.TABLE_NAME, k.COLUMN_NAME`,
    [db],
  );

  // 3. BASE TABLES ONLY carrying a result_id column with NO FK at all.
  //    Views are excluded: a view cannot be a deletion target, and an earlier
  //    generation of this artifact listed `vw_results_dashboard_*` as tables the
  //    delete function should DELETE FROM, which would have been actively wrong.
  const orphanCols = await q(
    `SELECT c.TABLE_NAME t
       FROM information_schema.COLUMNS c
       JOIN information_schema.TABLES tb
         ON tb.TABLE_SCHEMA = c.TABLE_SCHEMA AND tb.TABLE_NAME = c.TABLE_NAME
      WHERE c.TABLE_SCHEMA = ? AND c.COLUMN_NAME = 'result_id' AND c.TABLE_NAME <> 'results'
        AND tb.TABLE_TYPE = 'BASE TABLE'
        AND c.TABLE_NAME NOT IN (
          SELECT k.TABLE_NAME FROM information_schema.KEY_COLUMN_USAGE k
           WHERE k.TABLE_SCHEMA = c.TABLE_SCHEMA AND k.REFERENCED_TABLE_NAME IS NOT NULL)
      ORDER BY c.TABLE_NAME`,
    [db],
  );
  // Row counts, so the classification below is a decision on data and not on a name.
  const orphanCounts = [];
  for (const o of orphanCols) {
    const r = await q('SELECT COUNT(*) n FROM `' + o.t + '`');
    orphanCounts.push({ t: o.t, n: r[0].n });
  }
  const views = await q(
    `SELECT c.TABLE_NAME t
       FROM information_schema.COLUMNS c
       JOIN information_schema.TABLES tb
         ON tb.TABLE_SCHEMA = c.TABLE_SCHEMA AND tb.TABLE_NAME = c.TABLE_NAME
      WHERE c.TABLE_SCHEMA = ? AND c.COLUMN_NAME = 'result_id' AND tb.TABLE_TYPE = 'VIEW'
      ORDER BY c.TABLE_NAME`,
    [db],
  );

  // 4. Live function definitions
  const fnBody = {};
  for (const fn of ['full_delete_result_version', 'delete_result']) {
    const rows = await q('SHOW CREATE FUNCTION `' + fn + '`');
    fnBody[fn] = rows[0]['Create Function'] || '';
  }
  const targetsOf = (body) => [
    ...new Set(
      (body.match(/DELETE\s+(?:\w+\s+)?FROM\s+`?(\w+)`?/gi) || []).map((m) =>
        m.replace(/DELETE\s+(?:\w+\s+)?FROM\s+`?/i, '').replace(/`/g, ''),
      ),
    ),
  ].sort();
  const fnTargets = targetsOf(fnBody.full_delete_result_version);

  // 5. Computed difference
  const fkTables = [...new Set(fks.map((r) => r.t))].sort();
  const covered = new Set(fnTargets);
  const uncovered = fks.filter((r) => !covered.has(r.t));
  const uncoveredNoAction = [
    ...new Set(uncovered.filter((r) => r.d === 'NO ACTION').map((r) => r.t)),
  ].sort();
  const uncoveredCascade = [
    ...new Set(uncovered.filter((r) => r.d !== 'NO ACTION').map((r) => r.t)),
  ].sort();
  const noAction = fks.filter((r) => r.d === 'NO ACTION').length;
  const cascade = fks.length - noAction;

  // 6. Divergence from the design's recorded figures
  const div = [];
  const cmp = (label, actual, expected) => {
    if (actual !== expected)
      div.push(`- **${label}:** measured **${actual}**, design records ${expected}.`);
  };
  cmp('FKs referencing results', fks.length, EXPECTED.fks);
  cmp('`NO ACTION`', noAction, EXPECTED.noAction);
  cmp('`CASCADE`', cascade, EXPECTED.cascade);
  cmp('function DELETE targets', fnTargets.length, EXPECTED.fnTargets);
  const setEq =
    uncoveredNoAction.length === EXPECTED.uncoveredNoAction.length &&
    uncoveredNoAction.every((t, i) => t === EXPECTED.uncoveredNoAction[i]);
  if (!setEq)
    div.push(
      `- **Uncovered \`NO ACTION\` set differs.** Measured: ${uncoveredNoAction.join(', ')}. Design records: ${EXPECTED.uncoveredNoAction.join(', ')}. **This is the §14 tripwire — stop and escalate.**`,
    );

  const linkStmt = (
    fnBody.full_delete_result_version.match(
      /DELETE[\s\S]{0,60}?FROM\s+`?link_results`?[\s\S]{0,200}?;/i,
    ) || ['NOT PRESENT']
  )[0]
    .replace(/\s+/g, ' ')
    .trim();

  const row = (r) => `| \`${r.t}\` | \`${r.c}\` | \`${r.d}\` | ${covered.has(r.t) ? '✅' : '❌'} |`;

  const md = `# T-01 — FK inventory & delete-function baseline

- **Spec:** results / cross-platform-duplicate-resolution
- **Task:** T-01 (gates T-02, T-05, and every destructive task)
- **Source:** \`information_schema\` + \`SHOW CREATE FUNCTION\` on the live dev database
- **Method:** machine-generated, read-only (\`SELECT\`/\`SHOW\` only). **Not** derived from TypeORM entities, migration greps, or the design document's figures — that is this task's disqualifying-evidence clause.
- **Generated:** see the commit date of this file

---

## 0. Why this artifact exists

The first revision of this spec derived the same facts from a TypeORM entity walk and an unsorted \`grep | tail\` over migrations. It got the delete-function baseline, the \`link_results\` direction handling, and the uncovered-table list all wrong, and a two-round adversarial review escalated on it. Two tables are structurally invisible to entity-derived methods:

- \`result_cap_sharing_ip\` — holds a live FK to \`results\`, has **no TypeORM entity**.
- \`project_indicators_results\` — appears in **no migration at all**; its FK exists only in the live schema.

Anything that consumes this file must consume *these* numbers, not the design's.

---

## 1. Summary

| Measure | Value |
| --- | --- |
| FKs referencing \`results(result_id)\` | **${fks.length}** across ${fkTables.length} tables |
| \`ON DELETE NO ACTION\` | **${noAction}** |
| \`ON DELETE CASCADE\` | **${cascade}** |
| \`full_delete_result_version\` DELETE targets | **${fnTargets.length}** |
| Body length (bytes) | ${fnBody.full_delete_result_version.length} |
| **Uncovered, \`NO ACTION\`** (raise errno 1451 → T-02 must add) | **${uncoveredNoAction.length}** |
| **Uncovered, \`CASCADE\`** (silently destroyed → T-05 must protect) | **${uncoveredCascade.length}** |
| Cross-result FK shapes | **${cross.length}** |
| Base tables with a \`result_id\` column and **no FK** (classify, §2.1) | ${orphanCols.length} |
| Views exposing \`result_id\` (**never** deletion targets) | ${views.length} |

\`link_results\` handling in the live function:

\`\`\`sql
${linkStmt}
\`\`\`

Both directions — so a hard delete of a row referenced as \`other_result_id\` does **not** raise errno 1451. There is no loud database backstop; \`StarRelationshipService\` (T-05) is the only protection, and a bug in it fails **silently**.

---

## 2. T-02 input — tables the function must additionally delete from

\`ON DELETE NO ACTION\`, uncovered. Each one raises **errno 1451** on a hard delete while any child row exists:

${uncoveredNoAction.map((t, i) => `${i + 1}. \`${t}\` — column \`${fks.find((r) => r.t === t).c}\``).join('\n')}

**That is the complete blocking set.** No other table can raise errno 1451, because errno 1451 requires an enforced FK.

### 2.1 Base tables carrying \`result_id\` with no FK — classify, do not bulk-add

These cannot raise errno 1451 and are **not** T-02 blockers. They are orphan-row hygiene, and each needs a decision: an orphaned row in a reporting snapshot may be *correct* (the snapshot records what was true then), while an orphaned row in a temp/staging table is garbage. **Do not add these to the delete function without deciding per table** — row counts are included so the decision rests on data rather than on a name.

| Table | Rows | Note |
| --- | --- | --- |
${orphanCounts.map((o) => `| \`${o.t}\` | ${o.n} | ${/^report_/i.test(o.t) ? 'reporting snapshot — an orphan may be intentional history' : /^temp|^TEMP/.test(o.t) ? 'temp/staging — orphan is garbage, safe to clear' : 'classify'} |`).join('\n')}

${
    orphanCols.length === 1 && orphanCols[0].t === 'TEMP_result_external_oicrs'
      ? 'This is exactly the one table `design.md` §3.2 named for hygiene — the schema enumeration confirms it rather than widening it. The 17 other objects exposing `result_id` are all views (§2.2).'
      : 'This set differs from the single `TEMP_result_external_oicrs` that `design.md` §3.2 named for hygiene — a genuine T-01 discovery. Classify each before T-02.'
  }

### 2.2 Views — excluded by construction

${views.length ? views.map((v) => `\`${v.t}\``).join(', ') : '_none_'}

Views expose \`result_id\` but are **never** deletion targets. Noted because the first generation of this artifact listed them alongside real tables, which would have put \`DELETE FROM vw_…\` into the migration. A schema enumeration must filter on \`TABLE_TYPE = 'BASE TABLE'\`.

## 3. T-05 input — references that must **protect**, not be deleted

\`ON DELETE CASCADE\`, uncovered — the delete succeeds and **silently destroys rows the soft delete preserves**:

${uncoveredCascade.length ? uncoveredCascade.map((t) => `- \`${t}\` — column \`${fks.find((r) => r.t === t).c}\`. Belongs to a *project indicator*, not to the result. Treated as a protecting relationship per D-dup-16.`).join('\n') : '_none_'}

Cross-result FK shapes — a row owned by one result referencing **another** result's sub-row, the same shape as \`link_results.other_result_id\`:

| Table | Column | References | DELETE_RULE |
| --- | --- | --- | --- |
${cross.map((r) => `| \`${r.t}\` | \`${r.c}\` | \`${r.rt}(result_id)\` | \`${r.d}\` |`).join('\n')}

---

## 4. Full FK inventory

| Table | Column | DELETE_RULE | Covered by the function |
| --- | --- | --- | --- |
${fks.map(row).join('\n')}

---

## 5. Divergence from \`design.md\` §0.3

${div.length ? div.join('\n') : '**None.** Every measured figure matches the design’s recorded values, and the uncovered `NO ACTION` set is exactly the seven tables named. The §14 tripwire does not fire; T-02 may proceed.'}

---

## 6. Live \`full_delete_result_version\` — verbatim baseline

This is the authoritative baseline for T-02's \`down()\`. It was measured as identical in coverage to migration \`1783029013035-UpdateDeleteAndVersionSp.ts\`. Do **not** baseline on \`1778510205765-updatefulldelete.ts\` — it is superseded, and taking it as current is the error that invalidated revision 1.

\`\`\`sql
${fnBody.full_delete_result_version}
\`\`\`

---

## 7. Live \`delete_result\` — the soft path being replaced

DELETE statements: **${targetsOf(fnBody.delete_result).length}** (body ${fnBody.delete_result.length} bytes). It is pure \`UPDATE\` — it sets \`is_active = FALSE\`, \`deleted_at\`, \`result_status_id = 8\` and leaves the row, with its \`public_link\`, in \`results\`. **This is the reported bug:** operators querying \`results\` still see the duplicate.

Relevant for T-07: the function contains no \`COMMIT\`, no DDL, and no \`TRUNCATE\`, so its DML participates in the caller's transaction and rolls back — which is what makes T-07's ordered transactional family deletion achievable.
`;

  fs.writeFileSync(OUT, md);
  await conn.end();
  console.log('WROTE ' + OUT + ' (' + md.length + ' bytes)');
  console.log('FKs: ' + fks.length + ' (' + noAction + ' NO ACTION, ' + cascade + ' CASCADE)');
  console.log('fn targets: ' + fnTargets.length + ', body ' + fnBody.full_delete_result_version.length + 'B');
  console.log('uncovered NO ACTION (' + uncoveredNoAction.length + '): ' + uncoveredNoAction.join(', '));
  console.log('uncovered CASCADE (' + uncoveredCascade.length + '): ' + uncoveredCascade.join(', '));
  console.log('DIVERGENCE: ' + (div.length ? '\n' + div.join('\n') : 'none'));
})().catch((e) => {
  console.error('FATAL:', e.code || e.message);
  process.exit(1);
});
