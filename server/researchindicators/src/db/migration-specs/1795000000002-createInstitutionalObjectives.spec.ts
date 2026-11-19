import { readFileSync } from 'fs';
import { join } from 'path';
import { QueryRunner } from 'typeorm';
import { CreateInstitutionalObjectives1795000000002 } from '../migrations/1795000000002-createInstitutionalObjectives';

/**
 * Behavioral spec for `1795000000002-createInstitutionalObjectives`
 * (docs/specs/institutional-performance/strategy-framework, T-02,
 * R-STF-005, R-STF-009, R-STF-010, design §3.1 and §3.3).
 *
 * UNIT test (`npm test`). The `QueryRunner` records SQL. It is not a MySQL
 * connection, so it cannot prove the CASCADE and RESTRICT foreign keys fire
 * (KZ-017). That is the scratch-schema run.
 */

const MIGRATION_FILE = join(
  __dirname,
  '../migrations/1795000000002-createInstitutionalObjectives.ts',
);

const PLACEHOLDER = /(?:\?)|(?::(?:\d+|[a-zA-Z][a-zA-Z0-9_]*))/;

function recordingRunner(): { runner: QueryRunner; calls: string[] } {
  const calls: string[] = [];
  const runner = {
    query: jest.fn(async (sql: string) => {
      calls.push(sql);
      return undefined;
    }),
  } as unknown as QueryRunner;
  return { runner, calls };
}

const compact = (sql: string) => sql.replace(/\s+/g, ' ').trim();

describe('CreateInstitutionalObjectives1795000000002', () => {
  describe('source (raw file text)', () => {
    let src: string;

    beforeAll(() => {
      src = readFileSync(MIGRATION_FILE, 'utf8');
    });

    it('exports only its migration class', () => {
      const exported = src.match(/^export .+$/gm) ?? [];
      expect(exported).toHaveLength(1);
      expect(exported[0]).toContain(
        'CreateInstitutionalObjectives1795000000002',
      );
    });

    it('declares the connection collation and the IOB unique keys', () => {
      const flat = src.replace(/\\`/g, '`').replace(/\s+/g, ' ');
      expect(flat).toContain('utf8mb4_0900_ai_ci');
      expect(flat).not.toContain('utf8mb4_unicode_ci');
      expect(flat).toContain(
        'UNIQUE INDEX `uq_iob_portfolio_year_code` (`portfolio_id`, `year`, `code`)',
      );
      expect(flat).toContain(
        'UNIQUE INDEX `uq_iob_element` (`institutional_objective_id`, `element_id`)',
      );
      expect(flat).toContain('INDEX `idx_iob_portfolio_year`');
      expect(flat).toContain('INDEX `idx_iob_element_element`');
    });
  });

  describe('up()', () => {
    it('creates objectives then links, CASCADE to the objective and RESTRICT to the element', async () => {
      const migration = new CreateInstitutionalObjectives1795000000002();
      const { runner, calls } = recordingRunner();

      await migration.up(runner);

      const sql = calls.map(compact);
      expect(sql[0]).toMatch(/^CREATE TABLE `institutional_objectives`/);
      expect(sql[0]).toContain('`statement` text NOT NULL');
      expect(sql[1]).toMatch(
        /FK_institutional_objectives_portfolio_id` FOREIGN KEY \(`portfolio_id`\) REFERENCES `portfolios`\(`id`\) ON DELETE RESTRICT$/,
      );
      expect(sql[2]).toMatch(
        /^CREATE TABLE `institutional_objective_elements`/,
      );
      expect(sql[3]).toMatch(
        /FK_iob_elements_objective_id` FOREIGN KEY \(`institutional_objective_id`\) REFERENCES `institutional_objectives`\(`id`\) ON DELETE CASCADE$/,
      );
      expect(sql[4]).toMatch(
        /FK_iob_elements_element_id` FOREIGN KEY \(`element_id`\) REFERENCES `framework_elements`\(`id`\) ON DELETE RESTRICT$/,
      );
      expect(sql).toHaveLength(5);
      expect(sql.join('\n').match(/ON DELETE RESTRICT/g)).toHaveLength(2);
      expect(sql.join('\n').match(/ON DELETE CASCADE/g)).toHaveLength(1);
      expect(sql.filter((statement) => PLACEHOLDER.test(statement))).toEqual(
        [],
      );
    });
  });

  describe('down()', () => {
    it('drops links, then objectives', async () => {
      const migration = new CreateInstitutionalObjectives1795000000002();
      const { runner, calls } = recordingRunner();

      await migration.down(runner);

      expect(calls.map(compact)).toEqual([
        'DROP TABLE `institutional_objective_elements`',
        'DROP TABLE `institutional_objectives`',
      ]);
    });
  });
});
