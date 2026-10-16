import { QueryRunner } from 'typeorm';
import { BackfillPrmsResultCodeOnLiveVersions1791316921000 } from '../migrations/1791316921000-backfillPrmsResultCodeOnLiveVersions';

describe('backfillPrmsResultCodeOnLiveVersions migration', () => {
  const runUp = async () => {
    const query = jest.fn().mockResolvedValue(undefined);
    await new BackfillPrmsResultCodeOnLiveVersions1791316921000().up({
      query,
    } as unknown as QueryRunner);
    return query;
  };

  it('fills only active STAR live rows that have no code yet', async () => {
    const query = await runUp();
    const sql = String(query.mock.calls[0][0]);

    expect(query).toHaveBeenCalledTimes(1);
    expect(sql).toMatch(/SET live\.prms_result_code = src\.prms_result_code/);
    expect(sql).toMatch(/live\.is_snapshot = FALSE/);
    expect(sql).toMatch(/live\.is_active = TRUE/);
    // Official codes are shared with TIP, PRMS and AICCRA rows.
    expect(sql).toMatch(/live\.platform_code = 'STAR'/);
    expect(sql).toMatch(/live\.prms_result_code IS NULL/);
  });

  it('takes the code from active STAR versions, and only when they agree', async () => {
    const sql = String((await runUp()).mock.calls[0][0]);

    expect(sql).toMatch(/v\.is_snapshot = TRUE/);
    expect(sql).toMatch(/v\.is_active = TRUE/);
    expect(sql).toMatch(/v\.platform_code = 'STAR'/);
    expect(sql).toMatch(/v\.prms_result_code IS NOT NULL/);
    expect(sql).toMatch(/HAVING COUNT\(DISTINCT v\.prms_result_code\) = 1/);
  });

  it('never copies the phase onto the live row', async () => {
    const sql = String((await runUp()).mock.calls[0][0]);

    expect(sql).not.toMatch(/prms_phase_id/);
  });

  it('passes NO parameters, so the named-placeholders rewriter cannot fire', async () => {
    const query = await runUp();

    for (const call of query.mock.calls) {
      expect(call[1]).toBeUndefined();
      expect(String(call[0])).not.toMatch(/\?|:[a-zA-Z]/);
    }
  });

  it('down writes nothing', async () => {
    await expect(
      new BackfillPrmsResultCodeOnLiveVersions1791316921000().down(),
    ).resolves.toBeUndefined();
  });
});
