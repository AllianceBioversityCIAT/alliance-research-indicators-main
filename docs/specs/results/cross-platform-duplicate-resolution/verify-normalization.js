/**
 * T-04 behavioral gate — the assertion no unit test can make.
 *
 * Whether two links actually match depends on MySQL collation handling, which is
 * invisible to a unit test without a database. This script evaluates the shipped
 * normalization expression against a live MySQL instance over an adversarial
 * table, and includes a NEGATIVE CONTROL proving the binary collation is
 * load-bearing rather than decorative.
 *
 * READ-ONLY: only SELECT. No DDL, no DML. Prints no credentials.
 *
 * Run from `server/researchindicators` (it reads that package's .env and
 * node_modules):
 *
 *   node -r ts-node/register/transpile-only \
 *     ../../docs/specs/results/cross-platform-duplicate-resolution/verify-normalization.js
 *
 * Exits non-zero on any failed case, so it can gate CI once a reachable database
 * exists. The standing assertion belongs in T-11's integration suite; this script
 * is what makes the gate runnable in one command in the meantime.
 */
const path = require('path');

// This script lives outside the server package, so resolve that package's
// dependencies explicitly rather than relying on NODE_PATH.
module.paths.unshift(path.join(process.cwd(), 'node_modules'));

require('dotenv').config();
const mysql = require('mysql2');
const mp = require('mysql2/promise');

const UTIL = path.join(
  process.cwd(),
  'src/domain/shared/utils/public-link-normalizer.util.ts',
);
const { normalizedPublicLinkSql, dedupScopeSql } = require(UTIL);

// The operand is referenced several times, so literals are inlined (escaped)
// rather than bound: hand-counting placeholders is how a first cut of this
// harness silently produced a malformed query.
const expr = (value) => normalizedPublicLinkSql(mysql.escape(value));

const HANDLE = 'https://cgspace.cgiar.org/handle/10568';

/** [expectation, label, a, b] — MATCH means the two must normalize equal. */
const CASES = [
  ['MATCH', 'scheme differs', 'https://doi.org/10.1/abc', 'http://doi.org/10.1/abc'],
  ['MATCH', 'no scheme at all', 'doi.org/10.1/abc', 'https://doi.org/10.1/abc'],
  ['MATCH', 'www prefix', 'https://doi.org/10.1/abc', 'https://www.doi.org/10.1/abc'],
  ['MATCH', 'WWW uppercase', 'https://WWW.doi.org/10.1/abc', 'https://doi.org/10.1/abc'],
  ['MATCH', 'trailing slash', 'https://doi.org/10.1/abc', 'https://doi.org/10.1/abc/'],
  ['MATCH', 'dx.doi.org resolver', 'https://dx.doi.org/10.1/abc', 'https://doi.org/10.1/abc'],
  ['MATCH', 'DX.DOI.ORG uppercase', 'https://DX.DOI.ORG/10.1/abc', 'https://doi.org/10.1/abc'],
  ['MATCH', 'surrounding whitespace', '  https://doi.org/10.1/abc  ', 'https://doi.org/10.1/abc'],
  ['MATCH', 'host letter case', 'https://DOI.ORG/10.1/abc', 'https://doi.org/10.1/abc'],
  ['MATCH', 'trailing empty query', 'https://doi.org/10.1/abc?', 'https://doi.org/10.1/abc'],
  ['MATCH', 'trailing empty fragment', 'https://doi.org/10.1/abc#', 'https://doi.org/10.1/abc'],
  ['MATCH', 'scheme + www + slash', 'HTTP://WWW.doi.org/10.1/abc/', 'https://doi.org/10.1/abc'],

  // The four that matter most. Each is a distinct publication, and matching them
  // would hard-delete one of the two.
  ['DIFFER', 'PATH letter case', `${HANDLE}/Abc`, `${HANDLE}/abc`],
  ['DIFFER', 'accented path', 'https://doi.org/10.1/jose', 'https://doi.org/10.1/josé'],
  ['DIFFER', 'non-empty query', 'https://doi.org/10.1/abc?v=2', 'https://doi.org/10.1/abc'],
  ['DIFFER', 'different path', 'https://doi.org/10.1/abc', 'https://doi.org/10.1/abd'],
  ['DIFFER', 'different host', 'https://doi.org/10.1/abc', 'https://hdl.handle.net/10.1/abc'],
  ['DIFFER', 'path case inside handle', `${HANDLE}/ABC/xyz`, `${HANDLE}/abc/xyz`],
];

/** Strips the outer CAST/COLLATE so the same expression can run un-collated. */
const withoutCollation = (sql) =>
  sql.replace(
    /^CAST\(\(([\s\S]*)\) AS CHAR CHARACTER SET utf8mb4\) COLLATE utf8mb4_bin$/,
    '($1)',
  );

(async () => {
  const conn = await mp.createConnection({
    host: process.env.ARI_MYSQL_HOST,
    user: process.env.ARI_MYSQL_USER_NAME,
    password: process.env.ARI_MYSQL_USER_PASS,
    database: process.env.ARI_MYSQL_NAME,
    connectTimeout: 30000,
  });

  let passed = 0;
  let failed = 0;

  console.log(`operand repetitions in the expression: ${(normalizedPublicLinkSql('__X__').match(/__X__/g) || []).length}`);
  console.log(`expression length: ${normalizedPublicLinkSql('r.public_link').length} chars\n`);

  for (const [expectation, label, a, b] of CASES) {
    const [rows] = await conn.query(
      `SELECT (${expr(a)}) AS na, (${expr(b)}) AS nb, ((${expr(a)}) = (${expr(b)})) AS eq`,
    );
    const equal = rows[0].eq === 1;
    const ok = (expectation === 'MATCH') === equal;
    ok ? passed++ : failed++;
    console.log(
      `${ok ? 'ok  ' : 'FAIL'} ${expectation.padEnd(6)} ${label.padEnd(24)} equal=${equal}`,
    );
    if (!ok) {
      console.log(`       a -> "${rows[0].na}"`);
      console.log(`       b -> "${rows[0].nb}"`);
    }
  }

  // --- negative control -----------------------------------------------------
  // Proves the collation does the work. Without it, two distinct publications
  // collapse into one group and one of them is hard-deleted.
  const A = `${HANDLE}/Abc`;
  const B = `${HANDLE}/abc`;
  const [ctl] = await conn.query(
    `SELECT ((${expr(A)}) = (${expr(B)})) AS with_collate,
            ((${withoutCollation(expr(A))}) = (${withoutCollation(expr(B))})) AS without_collate`,
  );
  const controlOk = ctl[0].with_collate === 0 && ctl[0].without_collate === 1;
  controlOk ? passed++ : failed++;
  console.log(
    `\n${controlOk ? 'ok  ' : 'FAIL'} NEGATIVE CONTROL  path-case pair: with COLLATE equal=${ctl[0].with_collate === 1}, without COLLATE equal=${ctl[0].without_collate === 1}`,
  );
  console.log(
    controlOk
      ? '     The binary collation is load-bearing: removing it makes the two distinct\n     publications match, which would hard-delete one of them.'
      : '     INCONCLUSIVE — the control did not behave as expected. Do not trust the\n     path-case assertion until this is understood.',
  );

  // --- group-count regression ----------------------------------------------
  // T-01 measured 116 live cross-platform groups. A materially different count
  // means the normalization changed behavior or the data moved; on dev this is a
  // regression check against a known baseline, never a production gate.
  const [groups] = await conn.query(
    `SELECT COUNT(*) AS n FROM (
       SELECT ${normalizedPublicLinkSql('r.public_link')} AS k
       FROM results r
       WHERE ${dedupScopeSql('r')}
       GROUP BY k
       HAVING COUNT(DISTINCT r.platform_code) > 1) t`,
  );
  console.log(
    `\ncross-platform groups under this normalization: ${groups[0].n}  (dev baseline from T-01: 116)`,
  );

  await conn.end();
  console.log(`\n${passed} passed, ${failed} failed`);
  process.exit(failed === 0 ? 0 : 1);
})().catch((error) => {
  console.error(`FATAL: ${error.code || error.sqlMessage || error.message}`);
  process.exit(2);
});
