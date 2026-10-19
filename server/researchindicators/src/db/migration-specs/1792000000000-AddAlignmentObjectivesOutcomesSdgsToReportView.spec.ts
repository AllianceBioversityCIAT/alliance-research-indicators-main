import { QueryRunner } from 'typeorm';
import { AddAlignmentObjectivesOutcomesSdgsToReportView1792000000000 } from '../migrations/1792000000000-AddAlignmentObjectivesOutcomesSdgsToReportView';
import { UpdateDateFormat1777046263538 } from '../migrations/1777046263538-updateDateFormat';

/**
 * SQL-text spec. A fake QueryRunner records the SQL passed to query() without
 * executing it, so this cannot reach whether MySQL accepts the statement or
 * what any cell reads (KZ-017). The SELECT was run read-only against Dev when
 * the migration was written.
 */

const NAMED_PLACEHOLDER = /(?:\?)|(?::(\d+|[a-zA-Z][a-zA-Z0-9_]*))/g;

async function record(
  run: (runner: QueryRunner) => Promise<void>,
): Promise<string[]> {
  const calls: string[] = [];
  const runner = {
    query: jest.fn(async (sql: string) => {
      calls.push(sql);
    }),
  } as unknown as QueryRunner;
  await run(runner);
  return calls;
}

function compact(sql: string): string {
  return sql.replace(/\s+/g, ' ').trim();
}

describe('AddAlignmentObjectivesOutcomesSdgsToReportView1792000000000', () => {
  const migration =
    new AddAlignmentObjectivesOutcomesSdgsToReportView1792000000000();

  it('replaces report_alliance_alignment with the three new columns gated like alignment_validation', async () => {
    const [sql, ...rest] = await record((r) => migration.up(r));
    expect(rest).toHaveLength(0);
    const flat = compact(sql);

    expect(flat).toMatch(
      /^CREATE OR REPLACE VIEW report_alliance_alignment AS/,
    );
    expect(flat).toContain(
      'report_field( sob.strategic_objectives, TRUE, COALESCE(get_portfolio_id_by_result(root.result_id) = 2, FALSE) ) AS strategic_objectives',
    );
    expect(flat).toContain(
      'report_field( iot.impact_outcomes, TRUE, COALESCE(get_portfolio_id_by_result(root.result_id) = 2, FALSE) AND root.indicator_id IN (4, 5, 6) ) AS impact_outcomes',
    );
    expect(flat).toContain(
      'report_field( sdg.sdgs, TRUE, root.indicator_id <> 5 ) AS sdgs',
    );
    expect(flat).toContain('AND rso.role_id = 1');
    expect(flat).toContain('AND rio.role_id = 1');
    expect(flat).toContain(
      'INNER JOIN clarisa_sdgs cs ON cs.id = rs.clarisa_sdg_id',
    );
  });

  it('reads SDG targets by sdg_target_id, includes lever-less Portfolio 2 rows, and applies them to OICR only', async () => {
    const [sql] = await record((r) => migration.up(r));
    const flat = compact(sql);

    expect(flat).toContain(
      'report_field(sdt.sdg_targets , TRUE, root.indicator_id = 5) AS sdg_targets',
    );
    expect(flat).toContain(
      'LEFT JOIN clarisa_sdg_targets cst ON cst.id = rlst.sdg_target_id',
    );
    expect(flat).not.toContain('cst.id = rlst.result_lever_sdg_target_id');
    expect(flat).toContain(
      'AND (rlst.result_lever_id IS NULL OR rl.is_active = TRUE)',
    );
    expect(flat).toContain('GROUP BY COALESCE(rl.result_id, rlst.result_id)');
  });

  it('keeps every column of the previous definition', async () => {
    const [sql] = await record((r) => migration.up(r));
    for (const alias of [
      'primary_project',
      'primary_project_principal_investigator',
      'primary_project_start_date',
      'primary_project_end_date',
      'contributing_projects',
      'primary_lever',
      'contributor_lever',
      'sdg_targets',
      'strategic_outcomes',
    ]) {
      expect(sql).toContain(`AS ${alias}`);
    }
  });

  it('restores the UpdateDateFormat1777046263538 definition on down()', async () => {
    const [downSql] = await record((r) => migration.down(r));
    const previous = (
      await record((r) => new UpdateDateFormat1777046263538().up(r))
    ).find((sql) => sql.includes('VIEW report_alliance_alignment'));
    expect(previous).toBeDefined();
    expect(downSql).toBe(previous);
  });

  it('carries no bind placeholders, since it passes no parameters', async () => {
    const sqls = [
      ...(await record((r) => migration.up(r))),
      ...(await record((r) => migration.down(r))),
    ];
    for (const sql of sqls) {
      const unquoted = sql.replace(/'(?:\\.|[^'\\])*'/g, "''");
      expect(unquoted.match(NAMED_PLACEHOLDER)).toBeNull();
    }
  });
});
