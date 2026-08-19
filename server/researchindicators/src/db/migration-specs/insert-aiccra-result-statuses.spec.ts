import { readFileSync } from 'fs';
import { join } from 'path';
import { QueryRunner } from 'typeorm';
import { ResultStatusEnum } from '../../domain/entities/result-status/enum/result-status.enum';
import { DeactivateAiccraEditingAndInsertMissingStatuses1787181821481 } from '../migrations/1787181821481-deactivateAiccraEditingAndInsertMissingStatuses';

const MERGED_AICCRA_SEED = join(
  __dirname,
  '../migrations/1767821369314-insertAndUpdateNewStatus.ts',
);

describe('AICCRA result statuses compensating migration (R-ARS-002, R-ARS-004)', () => {
  it('does not rewrite the merged AICCRA seed (R-ARS-004)', () => {
    const src = readFileSync(MERGED_AICCRA_SEED, 'utf8');
    expect(src).toContain("'Editing in AICCRA'");
    expect(src).toContain("'Submitted in AICCRA'");
  });

  it('maps Submitted to existing id 22 and adds 26-28 (R-ARS-001)', () => {
    expect(ResultStatusEnum.SUBMITTED_IN_AICCRA).toBe(22);
    expect(ResultStatusEnum.COMPLETED_IN_AICCRA).toBe(26);
    expect(ResultStatusEnum.EXTENDED_IN_AICCRA).toBe(27);
    expect(ResultStatusEnum.ON_GOING_IN_AICCRA).toBe(28);
    expect(
      (ResultStatusEnum as unknown as Record<string, number>).EDITING_IN_AICCRA,
    ).toBeUndefined();
  });

  it('deactivates 21 without deleting it, and inserts only 26-28 (R-ARS-002, R-ARS-003)', async () => {
    const query = jest.fn().mockResolvedValue(undefined);
    const queryRunner = { query } as unknown as QueryRunner;
    const migration =
      new DeactivateAiccraEditingAndInsertMissingStatuses1787181821481();

    await migration.up(queryRunner);

    const sql = query.mock.calls.map((call) => String(call[0]));
    const params = query.mock.calls.map((call) => call[1] as unknown[] | undefined);

    expect(sql[0]).toMatch(/UPDATE[\s\S]*is_active` = 0/i);
    expect(params[0]).toEqual([21]);
    expect(sql.every((s) => !/DELETE/i.test(s))).toBe(true);

    expect(sql[1]).toMatch(/INSERT INTO `result_status`/i);
    expect(params[1]).toEqual(
      expect.arrayContaining([
        ResultStatusEnum.COMPLETED_IN_AICCRA,
        ResultStatusEnum.EXTENDED_IN_AICCRA,
        ResultStatusEnum.ON_GOING_IN_AICCRA,
      ]),
    );
    expect(params[1]).not.toContain(ResultStatusEnum.SUBMITTED_IN_AICCRA);
    expect(params[1]).not.toContain(21);
  });
});
