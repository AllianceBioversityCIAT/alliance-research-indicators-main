#!/usr/bin/env node
/**
 * Loads the schema-only baseline dump (src/db/baseline/baseline.sql) into the
 * disposable scratch container (docker-compose.test.yml) BEFORE the migration
 * suite runs — see src/db/baseline/README.md for what the dump is and why.
 *
 * Ordering: this script must run ahead of `migration:test:execute`. Use the
 * combined `npm run migration:test:bootstrap` so the two cannot be run out of
 * order (docs/specs/bugfix/sp-versioning-roles-id/design.md §4.1 / DD-5).
 *
 * Safety (RB-1c, root CLAUDE.md §4.3): a "TEST"-named variable is not
 * evidence of a disposable target — this script verifies the RESOLVED host,
 * not just the variable name, and refuses to run if ARI_TEST_MYSQL_HOST
 * matches ARI_MYSQL_HOST (the shared, non-disposable dev database).
 *
 * Implemented in plain Node (not bash) so `.env` is parsed with the `dotenv`
 * package rather than shell-sourced — several existing values in `.env`
 * contain unquoted shell metacharacters (`<`, `>`, `&`, `*`) that break a
 * naive `source .env`.
 */
'use strict';

const path = require('path');
const fs = require('fs');
const { spawnSync, execSync } = require('child_process');

const PKG_ROOT = path.resolve(__dirname, '..');
const ENV_FILE = path.join(PKG_ROOT, '.env');
const BASELINE_FILE = path.join(PKG_ROOT, 'src', 'db', 'baseline', 'baseline.sql');
const CONTAINER_NAME = 'research_indicators_server_test_mysql';

function fail(message) {
  console.error(`ERROR: ${message}`);
  process.exit(1);
}

if (!fs.existsSync(ENV_FILE)) {
  fail(`${ENV_FILE} not found. Copy .env.example to .env and fill in ARI_TEST_MYSQL_*.`);
}

require('dotenv').config({ path: ENV_FILE });

const required = [
  'ARI_TEST_MYSQL_HOST',
  'ARI_TEST_MYSQL_USER_NAME',
  'ARI_TEST_MYSQL_USER_PASS',
  'ARI_TEST_MYSQL_NAME',
];
for (const key of required) {
  if (!process.env[key]) {
    fail(`${key} not set in .env`);
  }
}

const {
  ARI_TEST_MYSQL_HOST,
  ARI_TEST_MYSQL_USER_NAME,
  ARI_TEST_MYSQL_USER_PASS,
  ARI_TEST_MYSQL_NAME,
  ARI_MYSQL_HOST,
} = process.env;

// RB-1c: verify the resolved host, never trust the variable name alone.
if (ARI_MYSQL_HOST && ARI_TEST_MYSQL_HOST === ARI_MYSQL_HOST) {
  fail(
    `ARI_TEST_MYSQL_HOST (${ARI_TEST_MYSQL_HOST}) is the same host as ARI_MYSQL_HOST. ` +
      'That is the shared, non-disposable dev database (root CLAUDE.md §4.3, RB-1c) — refusing to load onto it.',
  );
}

if (!fs.existsSync(BASELINE_FILE)) {
  fail(
    `${BASELINE_FILE} not found.\n` +
      '       See src/db/baseline/README.md for how to generate it (read-only mysqldump against the shared dev DB).',
  );
}

let runningContainers;
try {
  runningContainers = execSync('docker ps --format {{.Names}}').toString();
} catch (err) {
  fail(`could not query docker: ${err.message}`);
}
if (!runningContainers.split('\n').includes(CONTAINER_NAME)) {
  fail(`container '${CONTAINER_NAME}' is not running. Run: npm run compose:test:up`);
}

console.log(
  `Loading schema-only baseline into '${ARI_TEST_MYSQL_NAME}' (host ${ARI_TEST_MYSQL_HOST}, container ${CONTAINER_NAME})...`,
);

const inputFd = fs.openSync(BASELINE_FILE, 'r');
const result = spawnSync(
  'docker',
  [
    'exec',
    '-i',
    CONTAINER_NAME,
    'mysql',
    `-u${ARI_TEST_MYSQL_USER_NAME}`,
    `-p${ARI_TEST_MYSQL_USER_PASS}`,
    ARI_TEST_MYSQL_NAME,
  ],
  { stdio: [inputFd, 'inherit', 'inherit'] },
);
fs.closeSync(inputFd);

if (result.status !== 0) {
  fail(`docker exec mysql load failed (exit ${result.status}).`);
}

console.log('Baseline loaded.');
