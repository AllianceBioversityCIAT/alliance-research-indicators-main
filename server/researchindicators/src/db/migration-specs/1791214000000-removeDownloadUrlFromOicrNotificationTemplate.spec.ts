import { readFileSync } from 'fs';
import { join } from 'path';
import { QueryRunner } from 'typeorm';
import { RemoveDownloadUrlFromOicrNotificationTemplate1791214000000 } from '../migrations/1791214000000-removeDownloadUrlFromOicrNotificationTemplate';

/**
 * Structural spec for the removal of the "download as a Word document"
 * sentence from the `oicr-notification-created` email body.
 *
 * UNIT test (`npm test`) — never opens a MySQL connection. It runs `up()` and
 * `down()` against a fake `QueryRunner` that records the SQL text, then
 * asserts on that text plus a raw-source read of the migration file.
 *
 * Lives in `src/db/migration-specs/`, NOT beside the migration: a `.spec.ts`
 * inside `db/migrations/` is picked up by the TypeORM migrations glob and
 * crashes the runner (`server/researchindicators/src/CLAUDE.md` §9).
 *
 * CANNOT PROVE (KZ-017): this spec asserts SQL *text* only. It does not prove
 * the fragment actually matches the stored value, that the row shrinks, or
 * that `down()` restores it — those were measured against a real MySQL
 * instance separately, and the whitespace fidelity this migration depends on
 * is exactly the property a text assertion is weakest at.
 */

const MIGRATION_FILE = join(
  __dirname,
  '../migrations/1791214000000-removeDownloadUrlFromOicrNotificationTemplate.ts',
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

describe('RemoveDownloadUrlFromOicrNotificationTemplate1791214000000', () => {
  const migration =
    new RemoveDownloadUrlFromOicrNotificationTemplate1791214000000();

  describe('up()', () => {
    let calls: string[];
    let sql: string;

    beforeAll(async () => {
      const { runner, calls: recorded } = createRecordingQueryRunner();
      await migration.up(runner);
      calls = recorded;
      sql = recorded.join('\n');
    });

    it('issues exactly one UPDATE, against sec_template', () => {
      expect(calls).toHaveLength(1);
      expect(sql).toMatch(/UPDATE\s+sec_template/);
    });

    it('is scoped to the oicr-notification-created row only', () => {
      expect(sql).toContain("WHERE name = 'oicr-notification-created'");
      expect(sql).not.toMatch(/WHERE name IN/);
    });

    it('replaces the fragment with an empty string', () => {
      expect(sql).toContain('SET template = REPLACE(');
      expect(sql).toMatch(/,\s*''\)/);
    });

    it('builds the fragment from CHAR(10) rather than literal newlines', () => {
      // The two continuation lines are indented by exactly six spaces. A
      // multi-line literal would make that indentation a function of the
      // migration file's own layout, and a REPLACE whose search string no
      // longer matches is a no-op that reports success.
      expect(sql).toContain('CHAR(10)');
      expect(sql).toContain("' <br />Additionally, you may download the'");
      expect(sql).toContain(
        "'      submission as a Word document using the following link:'",
      );
      expect(sql).toContain(
        '\'      <a href="{{download_url}}">{{download_url}}</a>\'',
      );
    });

    it('preserves the leading single space before <br /> and six spaces on each continuation line', () => {
      expect(sql).toMatch(/' <br \/>Additionally/);
      expect(sql).toMatch(/' {6}submission as a Word document/);
      expect(sql).toMatch(/' {6}<a href="\{\{download_url\}\}"/);
    });

    it('does not touch the STAR link', () => {
      const starLink = '<a href="{{url}}">{{url}}</a>';
      const occurrences = sql.split(starLink).length - 1;
      expect(occurrences).toBe(0);
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

    it('issues exactly one UPDATE', () => {
      expect(calls).toHaveLength(1);
    });

    it('re-attaches the fragment immediately after the STAR link', () => {
      expect(sql).toContain('\'<a href="{{url}}">{{url}}</a>\'');
      expect(sql).toContain('CHAR(10)');
      expect(sql).toContain("' <br />Additionally, you may download the'");
    });

    it('is guarded so it cannot append the fragment twice', () => {
      expect(sql).toContain("AND template NOT LIKE '%download_url%'");
    });

    it('rebuilds the same fragment up() removed', () => {
      const { runner: upRunner, calls: upCalls } = createRecordingQueryRunner();
      return migration.up(upRunner).then(() => {
        const pieces = [
          "' <br />Additionally, you may download the'",
          "'      submission as a Word document using the following link:'",
          '\'      <a href="{{download_url}}">{{download_url}}</a>\'',
        ];
        for (const p of pieces) {
          expect(upCalls.join('\n')).toContain(p);
          expect(sql).toContain(p);
        }
      });
    });
  });

  describe('source file', () => {
    const source = readFileSync(MIGRATION_FILE, 'utf8');

    it('contains no bare ? or :word outside quotes that mysql2 would read as a bind parameter', () => {
      // orm.config.ts sets extra.namedPlaceholders, so named-placeholders
      // rewrites every query first and has no notion of SQL comments.
      const sqlBlocks =
        source.match(/queryRunner\.query\(`([\s\S]*?)`\)/g) ?? [];
      expect(sqlBlocks.length).toBe(2);
      for (const block of sqlBlocks) {
        const withoutStrings = block.replace(/'[^']*'/g, "''");
        expect(withoutStrings).not.toMatch(/\?/);
        expect(withoutStrings).not.toMatch(/:[a-zA-Z0-9_]/);
      }
    });

    it('declares the fragment exactly once in code, shared by up() and down()', () => {
      // Two independent copies would drift: a reformat or a typo in one half
      // leaves a migration whose down() cannot restore what up() removed.
      // Comments are stripped first — the documentation quotes the fragment
      // more than once on purpose, and counting those made this assertion
      // measure the prose rather than the code.
      const code = source.replace(/\/\*[\s\S]*?\*\//g, '');
      const occurrences =
        code.split('Additionally, you may download the').length - 1;
      expect(occurrences).toBe(1);
      expect(code).toContain('FRAGMENT_SQL');
    });
  });
});
