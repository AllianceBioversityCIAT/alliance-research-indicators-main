// @akili-spec project-dashboard/indicator-metadata-charts
import { buildPrimaryContractResultsScopeSql } from './primary-contract-results.util';

/**
 * The scoping predicate is the one thing every section of `reports/full` depends
 * on — the six that predate this spec and the ten it adds. `requirements.md` §4.2
 * makes it a MUST precisely because its failure mode is silent: if it changes,
 * sections start counting a different population and nothing errors.
 *
 * These assertions exist because the extraction (RB-10) was proven equivalent by
 * hand and by a Reviewer reading two `git show` outputs — but **nothing
 * executable protected it**. That reduced the risk from "two copies drift apart"
 * to "one copy changes silently", which is better but not closed. This closes it.
 */
describe('buildPrimaryContractResultsScopeSql (requirements.md §4.2)', () => {
  const squash = (sql: string): string => sql.replace(/\s+/g, ' ').trim();

  it('scopes to primary, active, non-snapshot results for one contract', () => {
    const sql = squash(buildPrimaryContractResultsScopeSql());

    // Each predicate asserted individually: a single "contains the whole
    // string" assertion would pass while one filter was silently dropped,
    // which is the exact defect §4.2 guards against.
    expect(sql).toContain('SELECT DISTINCT r.result_id');
    expect(sql).toContain('FROM results r');
    expect(sql).toContain(
      'INNER JOIN result_contracts rc ON rc.result_id = r.result_id',
    );
    expect(sql).toContain('rc.contract_id = ?');
    expect(sql).toContain('rc.is_primary = TRUE');
    expect(sql).toContain('rc.is_active = TRUE');
    expect(sql).toContain('r.is_active = TRUE');
    expect(sql).toContain('r.is_snapshot = FALSE');
  });

  it('binds exactly one parameter — the contract id', () => {
    // The single-bind property is what makes one CTE safe across a
    // multi-branch UNION (design §6.1, DD-1). A second placeholder here would
    // shift every downstream branch's parameter position and, per DC-12,
    // return zero rows instead of erroring.
    const placeholders =
      buildPrimaryContractResultsScopeSql().match(/\?/g) ?? [];
    expect(placeholders).toHaveLength(1);
  });

  it('selects only result_id by default', () => {
    const sql = squash(buildPrimaryContractResultsScopeSql());
    expect(sql).toContain('SELECT DISTINCT r.result_id FROM');
    expect(sql).not.toContain('geo_scope_id');
  });

  it('also selects geo_scope_id when asked — the geographic report path', () => {
    // `buildContractResultsSubquery()` passes this, and the geographic report
    // reads `geo_scope_id` off the subquery. Dropping it would break a
    // pre-existing section, not a new one.
    const sql = squash(
      buildPrimaryContractResultsScopeSql({ includeGeoScope: true }),
    );
    expect(sql).toContain('SELECT DISTINCT r.result_id, r.geo_scope_id FROM');
  });

  it('keeps both option paths identical apart from the selected columns', () => {
    const withGeo = squash(
      buildPrimaryContractResultsScopeSql({ includeGeoScope: true }),
    );
    const withoutGeo = squash(buildPrimaryContractResultsScopeSql());

    // The two paths must differ in exactly one place. If a future edit adds a
    // filter to one branch of the ternary only, the six pre-existing sections
    // and the ten new ones would scope differently — the divergence RB-10 was
    // opened to prevent.
    expect(withGeo.replace('r.result_id, r.geo_scope_id', 'r.result_id')).toBe(
      withoutGeo,
    );
  });
});
