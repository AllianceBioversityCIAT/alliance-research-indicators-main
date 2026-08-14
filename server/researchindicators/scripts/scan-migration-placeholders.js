#!/usr/bin/env node
/**
 * Guard against the named-placeholder hazard in TypeORM migrations.
 *
 * `src/db/config/mysql/orm.config.ts` sets `extra.namedPlaceholders: true`, so
 * mysql2 rewrites every query through `named-placeholders` before sending it.
 * That tokenizer skips quoted string literals but does NOT skip SQL comments,
 * so a `:word` inside a `--` or block comment is consumed as a bind parameter
 * and the query throws
 *
 *     Named query contains placeholders, but parameters object is undefined
 *
 * before MySQL ever parses it. Migration 1784500000000 shipped with
 * `[SPEC:bilateral/...]` in a SQL comment and was unrunnable from the day it
 * was written; nothing caught it because no gate executed migrations.
 *
 * Behaviour verified against the installed `named-placeholders`:
 *   'text-align:justify' inside quotes  -> safe (2024 indicator migrations)
 *   -- [SPEC:bilateral/x]               -> HAZARD
 *   /* [SPEC:bilateral/x] *\/           -> HAZARD
 *   -- CAUTION: colon then space        -> safe
 *
 * Usage:  node scripts/scan-migration-placeholders.js [migrationsDir]
 * Exits 1 on any finding.
 */
const fs = require('fs');
const path = require('path');

const dir =
  process.argv[2] || path.join(__dirname, '..', 'src', 'db', 'migrations');

/** Blank out quoted runs so their contents can never register as a finding. */
function maskQuoted(sql) {
  let out = '';
  let quote = null;
  for (let i = 0; i < sql.length; i++) {
    const c = sql[i];
    if (quote) {
      // Doubled quote is an escaped quote, not a terminator.
      if (c === quote && sql[i + 1] === quote) {
        out += '  ';
        i++;
        continue;
      }
      if (c === '\\') {
        out += '  ';
        i++;
        continue;
      }
      out += c === '\n' ? '\n' : ' ';
      if (c === quote) quote = null;
      continue;
    }
    if (c === "'" || c === '"') {
      quote = c;
      out += ' ';
      continue;
    }
    out += c;
  }
  return out;
}

/** Return only the comment spans, with everything else blanked. */
function keepCommentsOnly(sql) {
  const masked = maskQuoted(sql);
  let out = '';
  for (let i = 0; i < masked.length; i++) {
    if (masked[i] === '-' && masked[i + 1] === '-') {
      const end = masked.indexOf('\n', i);
      const stop = end === -1 ? masked.length : end;
      out += masked.slice(i, stop);
      i = stop - 1;
      continue;
    }
    if (masked[i] === '/' && masked[i + 1] === '*') {
      const end = masked.indexOf('*/', i + 2);
      const stop = end === -1 ? masked.length : end + 2;
      out += masked.slice(i, stop);
      i = stop - 1;
      continue;
    }
    out += masked[i] === '\n' ? '\n' : ' ';
  }
  return out;
}

// `::` is an escape in named-placeholders; only a lone colon binds.
const HAZARD = /(^|[^:]):([A-Za-z_]\w*)/g;
const SQL_VERB = /\b(select|create|alter|drop|insert|update|delete|call)\b/i;

const files = fs.readdirSync(dir).filter(f => f.endsWith('.ts')).sort();
const findings = [];

for (const file of files) {
  const src = fs.readFileSync(path.join(dir, file), 'utf8');
  const literals = src.match(/`(?:\\[\s\S]|[^`\\])*`/g) || [];

  for (const literal of literals) {
    if (!SQL_VERB.test(literal)) continue;

    const commentsOnly = keepCommentsOnly(literal);
    for (const m of commentsOnly.matchAll(HAZARD)) {
      const line =
        src.slice(0, src.indexOf(literal) + m.index).split('\n').length;
      findings.push({ file, line, token: `:${m[2]}` });
    }
  }
}

for (const f of findings) {
  console.error(`HAZARD  ${f.file}:${f.line}  ${f.token} in a SQL comment`);
}

if (findings.length) {
  console.error(
    `\n${findings.length} named-placeholder hazard(s) across ${files.length} migrations.` +
      `\nDrop the colon (e.g. "[SPEC bilateral/x]") or put a space after it.`,
  );
  process.exit(1);
}

console.log(
  `clean — ${files.length} migrations scanned, no :placeholder in any SQL comment`,
);
