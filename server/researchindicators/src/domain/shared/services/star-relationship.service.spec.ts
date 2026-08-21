/**
 * Unit coverage for the protection guard.
 *
 * A mocked repository can prove the *logic* — which relationships protect, how the
 * OQ-7 flag behaves, that every id in a family is checked — but it cannot prove
 * the *query shape*. Over-protection and under-protection both look identical
 * against a mock that returns whatever the test hands it. So the query shape is
 * asserted structurally here (both directions present, counterpart constrained to
 * STAR, ids bound as parameters), and confirmed against real data by the T-12
 * dry-run, whose dev baseline is 19 STAR-referenced rows and 7 inactive STAR
 * links. A run over comparable data reporting zero protected rows means the query
 * is wrong, not that the data is clean.
 */
import { DataSource } from 'typeorm';
import { ReportingPlatformEnum } from '../../entities/results/enum/reporting-platform.enum';
import {
  PROTECT_INACTIVE_STAR_LINKS_KEY,
  ProtectingRelationshipKind,
  StarRelationshipService,
} from './star-relationship.service';

type Rows = Record<string, unknown>[];

type Fixture = {
  starLinksTo?: Rows;
  linksToStar?: Rows;
  cascades?: Rows;
  config?: Rows;
  configThrows?: boolean;
};

const calls: { sql: string; params: unknown[] }[] = [];

const buildService = (fixture: Fixture) => {
  calls.length = 0;
  const query = jest.fn(async (sql: string, params: unknown[]) => {
    calls.push({ sql, params });
    if (sql.includes('app_config')) {
      if (fixture.configThrows) throw new Error('app_config unavailable');
      return fixture.config ?? [];
    }
    if (sql.includes('WHERE l.other_result_id IN'))
      return fixture.starLinksTo ?? [];
    if (sql.includes('WHERE l.result_id IN')) return fixture.linksToStar ?? [];
    if (sql.includes('project_indicators_results'))
      return fixture.cascades ?? [];
    throw new Error(`unexpected query: ${sql}`);
  });
  const dataSource = { query } as unknown as DataSource;
  return { service: new StarRelationshipService(dataSource), query };
};

const sqlFor = (fragment: string) =>
  calls.find((call) => call.sql.includes(fragment));

describe('StarRelationshipService — what protects', () => {
  it('a STAR result linking TO the row protects it', async () => {
    const { service } = buildService({
      starLinksTo: [
        {
          linkResultId: 5,
          resultId: 100,
          counterpartResultId: 900,
          linkIsActive: 1,
        },
      ],
    });

    const verdict = await service.evaluate([100]);

    expect(verdict.protectedResultIds).toEqual([100]);
    expect(verdict.relationships).toEqual([
      {
        resultId: 100,
        kind: ProtectingRelationshipKind.STAR_LINKS_TO_RESULT,
        counterpartResultId: 900,
        linkResultId: 5,
        linkIsActive: true,
      },
    ]);
  });

  it('the row linking TO a STAR result protects it — the direction never checked before', async () => {
    const { service } = buildService({
      linksToStar: [
        {
          linkResultId: 6,
          resultId: 101,
          counterpartResultId: 901,
          linkIsActive: 1,
        },
      ],
    });

    const verdict = await service.evaluate([101]);

    expect(verdict.protectedResultIds).toEqual([101]);
    expect(verdict.relationships[0].kind).toBe(
      ProtectingRelationshipKind.RESULT_LINKS_TO_STAR,
    );
  });

  it('a project_indicators_results row protects it — CASCADE deletes silently', async () => {
    const { service } = buildService({ cascades: [{ resultId: 102 }] });

    const verdict = await service.evaluate([102]);

    expect(verdict.protectedResultIds).toEqual([102]);
    expect(verdict.relationships[0]).toEqual({
      resultId: 102,
      kind: ProtectingRelationshipKind.PROJECT_INDICATOR_CASCADE,
      counterpartResultId: null,
      linkResultId: null,
      linkIsActive: null,
    });
  });

  it('nothing protects a row with no relationships', async () => {
    const { service } = buildService({});
    const verdict = await service.evaluate([103]);
    expect(verdict.protectedResultIds).toEqual([]);
    expect(verdict.relationships).toEqual([]);
    expect(await service.isProtected([103])).toBe(false);
  });

  it('issues no queries for an empty id list', async () => {
    const { service, query } = buildService({});
    const verdict = await service.evaluate([]);
    expect(query).not.toHaveBeenCalled();
    expect(verdict).toEqual({
      protectedResultIds: [],
      relationships: [],
      inactiveLinkOnlyResultIds: [],
    });
  });
});

describe('StarRelationshipService — query shape', () => {
  // The assertions a mock cannot make behaviorally. Both over- and
  // under-protection are invisible to a fixture-driven test.
  it('constrains the counterpart to STAR in BOTH directions', async () => {
    const { service } = buildService({});
    await service.evaluate([1, 2]);

    const toResult = sqlFor('WHERE l.other_result_id IN');
    const fromResult = sqlFor('WHERE l.result_id IN');

    for (const call of [toResult, fromResult]) {
      expect(call).toBeDefined();
      expect(call!.sql).toContain('JOIN results s');
      expect(call!.sql).toContain('s.platform_code = ?');
      expect(call!.params).toContain(ReportingPlatformEnum.STAR);
    }

    // The two directions must join on OPPOSITE columns, or one of them is a
    // duplicate of the other and a whole class of reference stays invisible.
    expect(toResult!.sql).toContain(
      'JOIN results s ON s.result_id = l.result_id',
    );
    expect(fromResult!.sql).toContain(
      'JOIN results s ON s.result_id = l.other_result_id',
    );
  });

  it('binds every result id as a parameter rather than interpolating it', async () => {
    const { service } = buildService({});
    await service.evaluate([11, 22, 33]);

    const toResult = sqlFor('WHERE l.other_result_id IN');
    expect(toResult!.sql).toContain('IN (?, ?, ?)');
    expect(toResult!.params.slice(0, 3)).toEqual([11, 22, 33]);

    const cascade = sqlFor('project_indicators_results');
    expect(cascade!.params).toEqual([11, 22, 33]);
  });

  it('never filters on is_active in SQL — the flag decides, so the audit sees both', async () => {
    // Filtering in SQL would hide inactive links from the audit record and make
    // the OQ-7 decision a query change instead of a config flip.
    const { service } = buildService({});
    await service.evaluate([1]);
    expect(sqlFor('WHERE l.other_result_id IN')!.sql).not.toContain(
      'is_active =',
    );
    expect(sqlFor('WHERE l.result_id IN')!.sql).not.toContain('is_active =');
  });
});

describe('StarRelationshipService — family scope', () => {
  it('a STAR link on ONE family member protects, so the family cannot be deleted', async () => {
    // Family expansion adds sibling ids the old call site never checked: the
    // guard ran on the loser's seed row while the delete removed the whole family.
    const { service } = buildService({
      starLinksTo: [
        {
          linkResultId: 7,
          resultId: 201,
          counterpartResultId: 900,
          linkIsActive: 1,
        },
      ],
    });

    const verdict = await service.evaluate([200, 201, 202]);

    expect(verdict.protectedResultIds).toEqual([201]);
    expect(await service.isProtected([200, 201, 202])).toBe(true);
  });

  it('deduplicates a row protected by several relationships', async () => {
    const { service } = buildService({
      starLinksTo: [
        {
          linkResultId: 8,
          resultId: 300,
          counterpartResultId: 900,
          linkIsActive: 1,
        },
      ],
      linksToStar: [
        {
          linkResultId: 9,
          resultId: 300,
          counterpartResultId: 901,
          linkIsActive: 1,
        },
      ],
      cascades: [{ resultId: 300 }],
    });

    const verdict = await service.evaluate([300]);

    expect(verdict.protectedResultIds).toEqual([300]);
    expect(verdict.relationships).toHaveLength(3);
  });
});

describe('StarRelationshipService — inactive links (OQ-7)', () => {
  const inactiveLink = [
    {
      linkResultId: 10,
      resultId: 400,
      counterpartResultId: 900,
      linkIsActive: 0,
    },
  ];

  it('protects by default when the config row is absent', async () => {
    // Deliberately more conservative than R-RES-004 as written. A soft-deleted
    // STAR link is recoverable today and would stop being so, and under-deletion
    // is the recoverable error.
    const { service } = buildService({ starLinksTo: inactiveLink, config: [] });

    const verdict = await service.evaluate([400]);

    expect(verdict.protectedResultIds).toEqual([400]);
    expect(verdict.inactiveLinkOnlyResultIds).toEqual([400]);
  });

  it('stops protecting when the config is explicitly false', async () => {
    const { service } = buildService({
      starLinksTo: inactiveLink,
      config: [{ value: 'false' }],
    });

    const verdict = await service.evaluate([400]);

    expect(verdict.protectedResultIds).toEqual([]);
    // Still reported, so the audit record shows what became deletable.
    expect(verdict.relationships).toHaveLength(1);
    expect(verdict.inactiveLinkOnlyResultIds).toEqual([400]);
  });

  it('reads the flag from the documented app_config key', async () => {
    const { service } = buildService({ starLinksTo: inactiveLink, config: [] });
    await service.evaluate([400]);
    const configCall = sqlFor('app_config');
    expect(configCall!.params).toEqual([PROTECT_INACTIVE_STAR_LINKS_KEY]);
  });

  it('protects when the config read fails outright', async () => {
    // A missing table or an unreadable config must never widen deletion.
    const { service } = buildService({
      starLinksTo: inactiveLink,
      configThrows: true,
    });

    const verdict = await service.evaluate([400]);

    expect(verdict.protectedResultIds).toEqual([400]);
  });

  it('does not list a row that also has an ACTIVE link as inactive-only', async () => {
    const { service } = buildService({
      starLinksTo: [
        ...inactiveLink,
        {
          linkResultId: 11,
          resultId: 400,
          counterpartResultId: 902,
          linkIsActive: 1,
        },
      ],
      config: [{ value: 'false' }],
    });

    const verdict = await service.evaluate([400]);

    // The active link protects regardless of the flag, so the OQ-7 decision does
    // not change this row's fate and it must not appear in the OQ-7 surface.
    expect(verdict.protectedResultIds).toEqual([400]);
    expect(verdict.inactiveLinkOnlyResultIds).toEqual([]);
  });

  it('maps missing link fields defensively rather than producing NaN', async () => {
    // link_results.result_id / other_result_id are NOT NULL and is_active has a
    // default, so this shape should not occur — but these come back from a raw
    // query, and Number(null) is 0 while Number(undefined) is NaN. A silent 0
    // would name the wrong counterpart in the audit record.
    const { service } = buildService({
      starLinksTo: [
        {
          linkResultId: null,
          resultId: 500,
          counterpartResultId: null,
          linkIsActive: null,
        },
      ],
    });

    const verdict = await service.evaluate([500]);

    expect(verdict.relationships[0]).toEqual({
      resultId: 500,
      kind: ProtectingRelationshipKind.STAR_LINKS_TO_RESULT,
      counterpartResultId: null,
      linkResultId: null,
      linkIsActive: null,
    });
    // linkIsActive null is not `false`, so it protects.
    expect(verdict.protectedResultIds).toEqual([500]);
    expect(verdict.inactiveLinkOnlyResultIds).toEqual([]);
  });

  it('treats a truthy config value as protecting', async () => {
    const { service } = buildService({
      starLinksTo: inactiveLink,
      config: [{ value: 'true' }],
    });
    const verdict = await service.evaluate([400]);
    expect(verdict.protectedResultIds).toEqual([400]);
  });
});
