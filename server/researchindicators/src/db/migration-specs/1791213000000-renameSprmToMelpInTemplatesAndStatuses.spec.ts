import { readFileSync } from 'fs';
import { join } from 'path';
import { QueryRunner } from 'typeorm';
import { RenameSprmToMelpInTemplatesAndStatuses1791213000000 } from '../migrations/1791213000000-renameSprmToMelpInTemplatesAndStatuses';

/**
 * Structural spec for the SPRM -> MELP copy rename.
 *
 * UNIT test (`npm test`) — never opens a MySQL connection. It runs `up()` and
 * `down()` against a fake `QueryRunner` that records the SQL text, then
 * asserts on that text plus a raw-source read of the migration file.
 *
 * Lives in `src/db/migration-specs/`, NOT beside the migration: a `.spec.ts`
 * inside `db/migrations/` is picked up by the TypeORM migrations glob and
 * crashes the runner with `ReferenceError: describe is not defined`
 * (`server/researchindicators/src/CLAUDE.md` §9).
 *
 * CANNOT PROVE (KZ-017): this spec asserts SQL *text* only. It does not prove
 * the UPDATEs land, that `REGEXP_REPLACE` matches the EN DASH, or that the
 * round-trip restores the originals byte-for-byte — those were measured
 * separately, read-only, against the live database before this migration was
 * authored, and belong to a real-MySQL fixture spec rather than here.
 */

const MIGRATION_FILE = join(
  __dirname,
  '../migrations/1791213000000-renameSprmToMelpInTemplatesAndStatuses.ts',
);

function createRecordingQueryRunner(): {
  runner: QueryRunner;
  calls: string[];
} {
  const calls: string[] = [];
  const runner = {
    query: jest.fn(async (sql: string) => {
      calls.push(sql);
      return undefined;
    }),
  } as unknown as QueryRunner;
  return { runner, calls };
}

describe('RenameSprmToMelpInTemplatesAndStatuses1791213000000', () => {
  const migration = new RenameSprmToMelpInTemplatesAndStatuses1791213000000();

  describe('up()', () => {
    let calls: string[];
    let sql: string;

    beforeAll(async () => {
      const { runner, calls: recorded } = createRecordingQueryRunner();
      await migration.up(runner);
      calls = recorded;
      sql = recorded.join('\n');
    });

    it('issues one UPDATE per target column', () => {
      expect(calls).toHaveLength(4);
      expect(calls.every((c) => /^\s*UPDATE\s/i.test(c))).toBe(true);
    });

    it('rewrites the two "Dear SPRM team," email bodies', () => {
      expect(sql).toContain(
        "REPLACE(template, 'Dear SPRM team,', 'Dear MELP team,')",
      );
      expect(sql).toContain(
        "WHERE name IN ('ask-help-content', 'oicr-notification-created')",
      );
    });

    it('collapses PISA-SPRM to MELP as a whole token, never to PISA-MELP', () => {
      expect(sql).toContain("REPLACE(template, 'PISA-SPRM team', 'MELP team')");
      expect(sql).not.toContain('PISA-MELP');
    });

    it('matches the status separator with a character class so the EN DASH is covered', () => {
      // result_status ids 9 and 10 store `PISA<U+2013>SPRM`, while
      // action_description stores an ASCII hyphen. A literal REPLACE written
      // with one dash is a silent no-op on the rows using the other.
      expect(sql).toContain("REGEXP_REPLACE(description, 'PISA[^A-Za-z]SPRM'");
      expect(sql).toContain(
        "REGEXP_REPLACE(action_description, 'PISA[^A-Za-z]SPRM'",
      );
    });

    it('targets only the three measured result_status rows', () => {
      expect(sql).toContain('WHERE result_status_id IN (9, 10, 11)');
      expect(sql).toContain('WHERE result_status_id = 10');
    });

    it('never issues a blanket SPRM replacement that could rewrite an email address', () => {
      expect(sql).not.toMatch(/REPLACE\(\s*template\s*,\s*'SPRM'/);
      expect(sql).not.toMatch(/REPLACE\(\s*description\s*,\s*'SPRM'/);
      expect(sql).not.toMatch(/REGEXP_REPLACE\([^,]+,\s*'SPRM'/);
    });

    it('touches no table other than sec_template and result_status', () => {
      const tables = calls
        .map((c) => /UPDATE\s+(\w+)/i.exec(c)?.[1])
        .filter(Boolean);
      expect([...new Set(tables)].sort()).toEqual([
        'result_status',
        'sec_template',
      ]);
    });
  });

  describe('down()', () => {
    let calls: string[];
    let sql: string;

    beforeAll(async () => {
      const { runner, calls: recorded } = createRecordingQueryRunner();
      await migration.down(runner);
      calls = recorded;
      sql = recorded.join('\n');
    });

    it('reverses every statement up() issued', () => {
      expect(calls).toHaveLength(4);
    });

    it('rebuilds the EN DASH from its hex bytes rather than a literal character', () => {
      // Guards the rollback against this file's own encoding being mangled by
      // an editor round-trip. 0xE28093 is U+2013 in UTF-8.
      expect(sql).toContain(
        "CONCAT('the PISA', _utf8mb4 0xE28093, 'SPRM team')",
      );
    });

    it('restores the ASCII hyphen where the original used one', () => {
      expect(sql).toContain(
        "REPLACE(action_description, 'the MELP team', 'the PISA-SPRM team')",
      );
      expect(sql).toContain(
        "REPLACE(template, 'the MELP team', 'the PISA-SPRM team')",
      );
    });

    it('replaces the capitalised form before the lowercase one on status 9', () => {
      // Status 9 carries both "The MELP team will review it" and "by the MELP
      // team". MySQL REPLACE() is case-sensitive, which is what keeps the two
      // apart — but only if the capitalised form is consumed first.
      const statusCall = calls.find((c) => c.includes('result_status_id IN'));
      expect(statusCall).toBeDefined();
      expect(statusCall!.indexOf("'The MELP team'")).toBeLessThan(
        statusCall!.indexOf("'the MELP team'"),
      );
    });
  });

  describe('source file', () => {
    const source = readFileSync(MIGRATION_FILE, 'utf8');

    it('contains no bare ? or :word outside quotes that mysql2 would read as a bind parameter', () => {
      // orm.config.ts sets extra.namedPlaceholders, so named-placeholders
      // rewrites every query first and has no notion of SQL comments.
      const sqlBlocks =
        source.match(/queryRunner\.query\(`([\s\S]*?)`\)/g) ?? [];
      expect(sqlBlocks.length).toBe(8);
      for (const block of sqlBlocks) {
        const withoutStrings = block.replace(/'[^']*'/g, "''");
        expect(withoutStrings).not.toMatch(/\?/);
        expect(withoutStrings).not.toMatch(/:[a-zA-Z0-9_]/);
      }
    });

    it('embeds no literal EN DASH character', () => {
      expect(source).not.toContain('–');
    });
  });
});
