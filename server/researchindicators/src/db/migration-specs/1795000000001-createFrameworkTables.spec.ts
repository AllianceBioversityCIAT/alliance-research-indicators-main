import { readFileSync } from 'fs';
import { join } from 'path';
import { QueryRunner } from 'typeorm';
import { CreateFrameworkTables1795000000001 } from '../migrations/1795000000001-createFrameworkTables';

/**
 * Behavioral spec for `1795000000001-createFrameworkTables`
 * (docs/specs/institutional-performance/strategy-framework, T-02,
 * R-STF-002, R-STF-003, R-STF-004, design §3.1 and §3.3).
 *
 * UNIT test (`npm test`). The `QueryRunner` records SQL. It is not a MySQL
 * connection.
 *
 * CANNOT PROVE (KZ-017): the source assertion below only checks that the
 * migration text contains the STORED generated-column DDL. It does not read
 * `information_schema.COLUMNS.EXTRA`. That read lives in T-10's schema
 * integration suite. A mock that returns a charset row does not prove the
 * staff foreign key either. Duplicate indicator levels (1062), an unknown
 * carnet (1452) and deleting a parent (1451) are real SQL against the
 * scratch schema, not this file.
 */

const MIGRATION_FILE = join(
  __dirname,
  '../migrations/1795000000001-createFrameworkTables.ts',
);

const PLACEHOLDER = /(?:\?)|(?::(?:\d+|[a-zA-Z][a-zA-Z0-9_]*))/;

function recordingRunner(): { runner: QueryRunner; calls: string[] } {
  const calls: string[] = [];
  const runner = {
    query: jest.fn(async (sql: string) => {
      calls.push(sql);
      if (/information_schema\.COLUMNS/i.test(sql)) {
        return [{ charset: 'utf8mb4', collation: 'utf8mb4_0900_ai_ci' }];
      }
      return undefined;
    }),
  } as unknown as QueryRunner;
  return { runner, calls };
}

const compact = (sql: string) => sql.replace(/\s+/g, ' ').trim();

describe('CreateFrameworkTables1795000000001', () => {
  describe('source (raw file text)', () => {
    let src: string;

    beforeAll(() => {
      src = readFileSync(MIGRATION_FILE, 'utf8');
    });

    it('exports only its migration class', () => {
      const exported = src.match(/^export .+$/gm) ?? [];
      expect(exported).toHaveLength(1);
      expect(exported[0]).toContain('CreateFrameworkTables1795000000001');
    });

    it('contains the STORED generated-column DDL', () => {
      const flat = src.replace(/\\`/g, '`').replace(/\s+/g, ' ');
      expect(flat).toContain(
        '`indicator_portfolio_key` bigint GENERATED ALWAYS AS (IF(`is_indicator_level` = 1, `portfolio_id`, NULL)) STORED',
      );
      expect(flat).toContain(
        'UNIQUE INDEX `uq_framework_levels_indicator` (`indicator_portfolio_key`)',
      );
      expect(flat).toContain('`short_label` varchar(20) NOT NULL');
      expect(flat).toContain(
        'UNIQUE INDEX `uq_framework_elements_portfolio_code` (`portfolio_id`, `code`)',
      );
    });

    it('uses the connection collation and the staff-carnet helper', () => {
      expect(src).toContain('utf8mb4_0900_ai_ci');
      expect(src).not.toContain('utf8mb4_unicode_ci');
      expect(src).toContain('readStaffCarnetColumnClause');
    });
  });

  describe('up()', () => {
    it('creates levels, elements, then responsibles, with RESTRICT on the parent and CASCADE on the responsible', async () => {
      const migration = new CreateFrameworkTables1795000000001();
      const { runner, calls } = recordingRunner();

      await migration.up(runner);

      const sql = calls.map(compact);
      expect(sql[0]).toMatch(/information_schema\.COLUMNS/);
      expect(sql[1]).toMatch(/^CREATE TABLE `framework_levels`/);
      expect(sql[2]).toMatch(
        /FK_framework_levels_portfolio_id` FOREIGN KEY \(`portfolio_id`\) REFERENCES `portfolios`\(`id`\) ON DELETE RESTRICT$/,
      );
      expect(sql[3]).toMatch(/^CREATE TABLE `framework_elements`/);
      expect(sql[4]).toMatch(/FK_framework_elements_portfolio_id`/);
      expect(sql[5]).toMatch(
        /FK_framework_elements_level_id` FOREIGN KEY \(`level_id`\) REFERENCES `framework_levels`\(`id`\) ON DELETE RESTRICT$/,
      );
      expect(sql[6]).toMatch(
        /FK_framework_elements_parent_id` FOREIGN KEY \(`parent_id`\) REFERENCES `framework_elements`\(`id`\) ON DELETE RESTRICT$/,
      );
      expect(sql[7]).toMatch(/^CREATE TABLE `framework_element_responsibles`/);
      expect(sql[7]).toContain(
        '`staff_carnet` varchar(10) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL',
      );
      expect(sql[7]).toContain(
        'UNIQUE INDEX `uq_framework_element_resp` (`element_id`, `staff_carnet`)',
      );
      expect(sql[8]).toMatch(
        /FK_framework_element_resp_element_id` FOREIGN KEY \(`element_id`\) REFERENCES `framework_elements`\(`id`\) ON DELETE CASCADE$/,
      );
      expect(sql[9]).toMatch(
        /FK_framework_element_resp_staff_carnet` FOREIGN KEY \(`staff_carnet`\) REFERENCES `alliance_user_staff`\(`carnet`\) ON DELETE RESTRICT$/,
      );
      expect(sql).toHaveLength(10);
      expect(sql.join('\n').match(/ON DELETE RESTRICT/g)).toHaveLength(5);
      expect(sql.join('\n').match(/ON DELETE CASCADE/g)).toHaveLength(1);
      expect(sql.filter((statement) => PLACEHOLDER.test(statement))).toEqual(
        [],
      );
    });
  });

  describe('down()', () => {
    it('drops responsibles, elements, then levels', async () => {
      const migration = new CreateFrameworkTables1795000000001();
      const { runner, calls } = recordingRunner();

      await migration.down(runner);

      expect(calls.map(compact)).toEqual([
        'DROP TABLE `framework_element_responsibles`',
        'DROP TABLE `framework_elements`',
        'DROP TABLE `framework_levels`',
      ]);
    });
  });
});
