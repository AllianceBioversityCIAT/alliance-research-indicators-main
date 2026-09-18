import { QueryRunner } from 'typeorm';
import { AddPrmsPhaseIdToResults1789761421000 } from '../migrations/1789761421000-addPrmsPhaseIdToResults';

describe('addPrmsPhaseIdToResults migration', () => {
  const run = async (direction: 'up' | 'down') => {
    const query = jest.fn().mockResolvedValue(undefined);
    const queryRunner = { query } as unknown as QueryRunner;
    await new AddPrmsPhaseIdToResults1789761421000()[direction](queryRunner);
    return query.mock.calls.map((call) => String(call[0]));
  };

  it('adds prms_phase_id to results as a NULLABLE bigint', async () => {
    const sql = await run('up');

    expect(sql).toHaveLength(1);
    expect(sql[0]).toMatch(
      /ALTER TABLE `results` ADD `prms_phase_id` bigint NULL/,
    );
    // No NOT NULL and no DEFAULT: rows synced before this column keep NULL, and
    // nothing backfills them (deliberate -- test data only, not yet in prod).
    expect(sql[0]).not.toMatch(/NOT NULL/);
    expect(sql[0]).not.toMatch(/DEFAULT/i);
  });

  it('drops the column on down', async () => {
    const sql = await run('down');

    expect(sql).toHaveLength(1);
    expect(sql[0]).toMatch(/DROP COLUMN `prms_phase_id`/);
  });

  it('passes NO parameters, so the named-placeholders rewriter cannot fire', async () => {
    // orm.config.ts sets extra.namedPlaceholders, so a bare `?` or `:word`
    // anywhere in the SQL -- comments included -- throws before MySQL parses it.
    const query = jest.fn().mockResolvedValue(undefined);
    await new AddPrmsPhaseIdToResults1789761421000().up({
      query,
    } as unknown as QueryRunner);

    for (const call of query.mock.calls) {
      expect(call[1]).toBeUndefined();
      expect(String(call[0])).not.toMatch(/\?|:[a-zA-Z]/);
    }
  });
});
