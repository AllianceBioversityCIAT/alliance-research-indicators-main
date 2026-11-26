import { QueryRunner } from 'typeorm';
import { OicrDetails20261792800000000 } from '../migrations/1792800000000-oicrDetails2026';

/**
 * SQL shape for `1792800000000-oicrDetails2026`. The SQL is not executed here;
 * the disposable TEST run is the execution gate.
 */
describe('oicrDetails2026 migration', () => {
  const migration = new OicrDetails20261792800000000();

  const capture = async (direction: 'up' | 'down'): Promise<string[]> => {
    const query = jest.fn(async (...args: unknown[]) => {
      expect(args[1]).toBeUndefined();
      return undefined;
    });
    await migration[direction]({ query } as unknown as QueryRunner);
    return query.mock.calls.map((call) => String(call[0]));
  };

  const fn = (sqls: string[]): string =>
    sqls.find((sql) => sql.startsWith('CREATE FUNCTION')) as string;

  describe('up', () => {
    let sqls: string[];
    beforeAll(async () => {
      sqls = await capture('up');
    });

    it('never uses ? or :word placeholders, comments included', () => {
      for (const sql of sqls) {
        expect(sql).not.toMatch(/\?|:[a-zA-Z]/);
      }
    });

    it('adds the new columns', () => {
      const all = sqls.join('\n');
      for (const column of [
        'problem_statement',
        'alliance_solution',
        'beneficiaries',
        'outcome_achieved',
        'outcome_achieved_edited',
        'acknowledgments',
      ]) {
        expect(all).toContain(`ADD COLUMN \`${column}\``);
      }
      expect(all).toContain(
        'ALTER TABLE `result_quantifications` ADD COLUMN `unit_macro_category` varchar(150) NULL',
      );
      expect(all).toContain(
        'ALTER TABLE `result_users` ADD COLUMN `orcid` varchar(19) NULL',
      );
      expect(all).toMatch(
        /`outcome_achieved_edited` tinyint\(1\) NOT NULL DEFAULT 0/,
      );
    });

    it('creates the three catalogs and the two link tables', () => {
      const all = sqls.join('\n');
      for (const table of [
        'oicr_audiences',
        'oicr_thematic_keywords',
        'quantification_unit_categories',
        'result_oicr_audiences',
        'result_oicr_thematic_keywords',
      ]) {
        expect(all).toContain(`CREATE TABLE \`${table}\``);
      }
    });

    it('seeds 7 audiences, 12 keywords and the unit categories', () => {
      const audiences = sqls.find((s) =>
        s.startsWith('INSERT INTO `oicr_audiences`'),
      ) as string;
      const keywords = sqls.find((s) =>
        s.startsWith('INSERT INTO `oicr_thematic_keywords`'),
      ) as string;
      const units = sqls.find((s) =>
        s.startsWith('INSERT INTO `quantification_unit_categories`'),
      ) as string;
      expect(audiences.match(/\('/g)).toHaveLength(7);
      expect(keywords.match(/\('/g)).toHaveLength(12);
      expect(audiences).toContain("'Farmers and Communities'");
      expect(keywords).toContain(
        "'Inclusive Digital Tools / Artificial Intelligence'",
      );
      expect(units).toContain("('Individuals', 'Farmers', 0)");
      expect(units).toContain(
        "('Performance Metrics & Indicators', 'Adoption Rate', 1)",
      );
      expect(units).toContain(
        "('Performance Metrics & Indicators', 'Post-harvest Losses', 1)",
      );
      expect(units).toContain(
        "('Performance Metrics & Indicators', 'Yield', 0)",
      );
      expect(units.match(/, 1\)/g)).toHaveLength(2);
      const macros = new Set(
        [...units.matchAll(/\('([^']+)', '/g)].map((m) => m[1]),
      );
      expect(macros.size).toBe(15);
    });

    it('recreates oicr_validation with the 2026 branch', () => {
      const sql = fn(sqls);
      expect(sql).toContain('v_report_year >= 2026');
      expect(sql).toContain('valid_text(ro.problem_statement)');
      expect(sql).toContain('valid_text(ro.alliance_solution)');
      expect(sql).toContain('valid_text(ro.beneficiaries)');
      expect(sql).toContain('valid_text(ro.outcome_achieved)');
      expect(sql).toContain('FROM result_oicr_audiences roa');
      expect(sql).toContain('FROM result_oicr_thematic_keywords rotk');
      expect(sql).toContain('FROM results r');
    });

    it('keeps the legacy rule for earlier years', () => {
      const sql = fn(sqls);
      const elseBranch = sql.slice(sql.indexOf('ELSE'), sql.indexOf('END IF;'));
      expect(elseBranch).toContain(
        'valid_text(ro.short_outcome_impact_statement)',
      );
      expect(elseBranch).not.toContain('problem_statement');
      const legacyBlocks = [
        'FROM result_tags rt',
        'FROM TEMP_result_external_oicrs treo',
        'rq.quantification_role_id = 1',
        'rq.quantification_role_id = 2',
        'FROM clarisa_impact_areas cia',
        'riagt.result_impact_area_id = ria.id',
      ];
      for (const block of legacyBlocks) {
        expect(sql).toContain(block);
      }
      expect(sql).not.toContain(
        'valid_text(ro.short_outcome_impact_statement)\n    AND',
      );
    });

    it('requires the audience and keyword links only for 2026', () => {
      const sql = fn(sqls);
      const guardStart = sql.indexOf(
        'IF v_report_year >= 2026 THEN',
        sql.indexOf('END IF;'),
      );
      const guarded = sql.slice(guardStart, sql.lastIndexOf('END IF;'));
      expect(guarded).toContain('result_oicr_audiences');
      expect(guarded).toContain('result_oicr_thematic_keywords');
      expect(sql.slice(0, guardStart)).not.toContain('result_oicr_audiences');
    });
  });

  describe('down', () => {
    let sqls: string[];
    beforeAll(async () => {
      sqls = await capture('down');
    });

    it('restores the previous oicr_validation and drops everything it added', () => {
      const sql = fn(sqls);
      expect(sql).toContain('valid_text(ro.short_outcome_impact_statement)');
      expect(sql).not.toContain('v_report_year');
      expect(sql).not.toContain('problem_statement');
      const all = sqls.join('\n');
      for (const table of [
        'result_oicr_thematic_keywords',
        'result_oicr_audiences',
        'quantification_unit_categories',
        'oicr_thematic_keywords',
        'oicr_audiences',
      ]) {
        expect(all).toContain(`DROP TABLE \`${table}\``);
      }
      expect(all).toContain('DROP COLUMN `orcid`');
      expect(all).toContain('DROP COLUMN `unit_macro_category`');
      expect(all).toContain('DROP COLUMN `problem_statement`');
    });

    it('never uses ? or :word placeholders', () => {
      for (const sql of sqls) {
        expect(sql).not.toMatch(/\?|:[a-zA-Z]/);
      }
    });
  });
});
