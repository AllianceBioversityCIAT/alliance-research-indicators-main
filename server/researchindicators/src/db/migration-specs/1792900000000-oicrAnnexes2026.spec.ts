import { QueryRunner } from 'typeorm';
import { OicrAnnexes20261792900000000 } from '../migrations/1792900000000-oicrAnnexes2026';

/**
 * SQL shape for `1792900000000-oicrAnnexes2026`. The SQL is not executed here;
 * the disposable TEST run is the execution gate.
 */
describe('oicrAnnexes2026 migration', () => {
  const migration = new OicrAnnexes20261792900000000();

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

    it('creates result_oicr_annexes with its columns and result index', () => {
      const table = sqls.find((s) =>
        s.includes('CREATE TABLE `result_oicr_annexes`'),
      ) as string;
      for (const col of [
        '`annex_type_id` tinyint NOT NULL',
        '`description` text NULL',
        '`photo_credits` text NULL',
        '`file_type` varchar(20) NULL',
        '`partner_consent` varchar(20) NULL',
        '`link` text NULL',
        '`is_active` tinyint NOT NULL DEFAULT 1',
        'INDEX `idx_result_oicr_annexes_result` (`result_id`)',
      ]) {
        expect(table).toContain(col);
      }
    });

    it('recreates evidences_validation with the 2026 annex rule', () => {
      const sql = fn(sqls);
      expect(sql).toContain('CREATE FUNCTION `evidences_validation`');
      expect(sql).toContain('r.report_year_id');
      const annexBlock = sql.slice(
        sql.indexOf('current_indicator = 5 AND v_report_year >= 2026'),
      );
      expect(annexBlock).toContain('FROM result_oicr_annexes roan');
      expect(annexBlock).toContain('valid_text(roan.description)');
      expect(annexBlock).toContain('valid_text(roan.link)');
      expect(annexBlock).toContain(
        'WHEN 1 THEN valid_text(roan.photo_credits)',
      );
      expect(annexBlock).toContain('WHEN 2 THEN valid_text(roan.file_type)');
      expect(annexBlock).toContain(
        'WHEN 3 THEN valid_text(roan.partner_consent)',
      );
      expect(annexBlock).toContain('IFNULL(COUNT(roan.id)');
      expect(annexBlock).toContain('roan.is_active = TRUE');
    });

    it('keeps the previous rule outside the annex guard', () => {
      const sql = fn(sqls);
      const before = sql.slice(
        0,
        sql.indexOf('current_indicator = 5 AND v_report_year'),
      );
      expect(before).not.toContain('result_oicr_annexes');
      expect(before).toContain('FROM result_notable_references rnr');
      expect(before).toContain('valid_text(ro.cgspace_link)');
    });
  });

  describe('down', () => {
    let sqls: string[];
    beforeAll(async () => {
      sqls = await capture('down');
    });

    it('restores the previous function and drops the table', () => {
      const sql = fn(sqls);
      expect(sql).toContain('CREATE FUNCTION `evidences_validation`');
      expect(sql).not.toContain('v_report_year');
      expect(sql).not.toContain('result_oicr_annexes');
      expect(sqls).toContain('DROP TABLE `result_oicr_annexes`');
    });

    it('never uses ? or :word placeholders', () => {
      for (const sql of sqls) {
        expect(sql).not.toMatch(/\?|:[a-zA-Z]/);
      }
    });
  });
});
