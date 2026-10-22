import 'reflect-metadata';
import 'dotenv/config';
import { DataSource, QueryRunner } from 'typeorm';
import {
  assertOrgSeedPostconditions,
  assertOrgSeedPreconditions,
  findOrgSeedPostconditionProblems,
  findOrgSeedPreconditionProblems,
  matchDirector,
  resolveSeedDirectors,
  seedOrgStructure,
  seedOrgUnitChangeLog,
  seedOrgUnits,
  seedOrgUnitVersions,
  SeedEntry,
  SEED_LAST_ID,
} from '../src/db/seeds/org-structure.seed';
import { seedControlListValues } from '../src/db/seeds/control-lists.seed';
import {
  createOrgTestDataSource,
  OrgFixtures,
  ORG_T05_PREFIX,
} from './support/org-structure-fixtures';

/**
 * Organizational Structure seed against the REAL local MySQL
 * (docs/specs/institutional-performance/organizational-structure, T-05,
 * R-ORG-015, design 3.4, D-ORG-12, D-ORG-14).
 *
 * Counts, parents, versions and log rows are asserted on the ROWS the
 * migration wrote (KZ-001), against literals written HERE (the confirmed
 * 3 / 19 / 1 / 94 = 117 of the mockup `TREE`, requester 2026-10-21), never
 * read back from the seed module (that would make the check circular).
 *
 * Scope note (KZ-017): this proves the seed ran on the LOCAL staff table
 * (3,085 rows). Which directors match on Dev or Prod depends on their own
 * staff tables and is NOT proven here. It cannot prove the names and parents
 * equal the source sheet (requester review at T-06). It does not run the
 * migration (`npm run migration:test:execute` did) and it never updates or
 * deletes a seeded row: the only writes are the seed functions' own
 * `INSERT ... WHERE NOT EXISTS` (0 rows) and `__T05_` staff probes, removed in
 * `afterAll`.
 */
describe('Organizational Structure — seed against real MySQL (T-05)', () => {
  let dataSource: DataSource;
  let runner: QueryRunner;
  let fixtures: OrgFixtures;

  const rows = async (sql: string): Promise<any[]> => dataSource.query(sql);
  const scalar = async (sql: string): Promise<number> =>
    Number(Object.values((await rows(sql))[0])[0]);

  beforeAll(async () => {
    dataSource = await createOrgTestDataSource('org-structure-seed');
    runner = dataSource.createQueryRunner();
    fixtures = new OrgFixtures(dataSource, ORG_T05_PREFIX);
  });

  afterAll(async () => {
    await fixtures?.cleanup();
    await runner?.release();
    await dataSource?.destroy();
  });

  const ids = `BETWEEN 1 AND ${SEED_LAST_ID}`;

  describe('seeded rows', () => {
    it('has 117 entries, ids 1..117, codes ORG-001..ORG-117, all active', async () => {
      expect(
        await scalar(`SELECT COUNT(*) FROM org_units WHERE id ${ids}`),
      ).toBe(117);
      const units = await rows(
        `SELECT id, code, status, status_from_year, successor_id
           FROM org_units WHERE id ${ids} ORDER BY id`,
      );
      units.forEach((unit, index) => {
        expect(Number(unit.id)).toBe(index + 1);
        expect(unit.code).toBe(`ORG-${String(index + 1).padStart(3, '0')}`);
        expect(unit.status).toBe('active');
        expect(unit.status_from_year).toBeNull();
        expect(unit.successor_id).toBeNull();
      });
    });

    it('counts per level are 3 / 19 / 1 / 94 (levels 20 / 21 / 22 / 23)', async () => {
      const perLevel = await rows(
        `SELECT level_value_id AS level, COUNT(*) AS n
           FROM org_unit_versions WHERE org_unit_id ${ids}
          GROUP BY level_value_id ORDER BY level_value_id`,
      );
      expect(perLevel.map((r) => [Number(r.level), Number(r.n)])).toEqual([
        [20, 3],
        [21, 19],
        [22, 1],
        [23, 94],
      ]);
    });

    it('every entry has exactly ONE version [2026, open) and ONE seed log row', async () => {
      const perUnit = await rows(
        `SELECT u.id,
                (SELECT COUNT(*) FROM org_unit_versions v WHERE v.org_unit_id = u.id) AS versions,
                (SELECT COUNT(*) FROM org_unit_versions v
                  WHERE v.org_unit_id = u.id AND v.valid_from_year = 2026
                    AND v.valid_to_year IS NULL) AS open2026,
                (SELECT COUNT(*) FROM org_unit_change_log l
                  WHERE l.org_unit_id = u.id AND l.action = 'seed') AS seeds,
                (SELECT COUNT(*) FROM org_unit_delegates d
                   JOIN org_unit_versions dv ON dv.id = d.org_unit_version_id
                  WHERE dv.org_unit_id = u.id) AS delegates
           FROM org_units u WHERE u.id ${ids}`,
      );
      expect(perUnit).toHaveLength(117);
      for (const row of perUnit) {
        expect([
          Number(row.versions),
          Number(row.open2026),
          Number(row.seeds),
          Number(row.delegates),
        ]).toEqual([1, 1, 1, 0]);
      }
    });

    it('parents follow the hierarchy rule: L1 none, L2 under L1, L3 under L2, L4 under L2 or L3', async () => {
      const bad = await rows(
        `SELECT v.org_unit_id, v.level_value_id, v.parent_id, pv.level_value_id AS parent_level
           FROM org_unit_versions v
           LEFT JOIN org_unit_versions pv ON pv.org_unit_id = v.parent_id
          WHERE v.org_unit_id ${ids}
            AND NOT (
              (v.level_value_id = 20 AND v.parent_id IS NULL)
              OR (v.level_value_id = 21 AND pv.level_value_id = 20)
              OR (v.level_value_id = 22 AND pv.level_value_id = 21)
              OR (v.level_value_id = 23 AND pv.level_value_id IN (21, 22))
            )`,
      );
      expect(bad).toEqual([]);
    });

    it('spot checks by fixed id: DT, the three formerly parentless units, the HR Operations office', async () => {
      const one = async (id: number) => {
        const [row] = await rows(
          `SELECT v.name, v.acronym, v.level_value_id AS level, v.parent_id AS parent,
                  pv.name AS parent_name
             FROM org_unit_versions v
             LEFT JOIN org_unit_versions pv ON pv.org_unit_id = v.parent_id
            WHERE v.org_unit_id = ${id}`,
        );
        return { ...row, level: Number(row.level), parent: Number(row.parent) };
      };

      // DT = Technology Integration, an L2 under Global Support (id 48).
      expect(await one(82)).toMatchObject({
        name: 'Technology Integration',
        acronym: 'DT',
        level: 21,
        parent: 48,
        parent_name: 'Global Support',
      });
      // The three units that had no parent in the source sheet.
      expect(await one(36)).toMatchObject({
        name: 'Plant Genetic Resources & seed Policies',
        parent: 34,
        parent_name: 'Biodiversity for Food and Agriculture',
      });
      expect(await one(106)).toMatchObject({
        name: 'Security',
        parent: 103,
        parent_name: 'Americas',
      });
      expect(await one(107)).toMatchObject({
        name: 'Bogota Office',
        parent: 103,
        parent_name: 'Americas',
      });
      // The only L3, with its mockup names kept verbatim.
      expect(await one(58)).toMatchObject({
        name: 'HR Operations',
        level: 22,
        parent: 53,
      });
      expect(await one(80)).toMatchObject({ name: 'Digital & Internal Comms' });
    });

    it('same-named units under Global Support and Regional are distinct entries', async () => {
      const names = await rows(
        `SELECT name, COUNT(*) AS n FROM org_unit_versions
          WHERE org_unit_id ${ids} AND name = 'Regional Communications'`,
      );
      expect(Number(names[0].n)).toBe(4);
    });

    it('the next id handed out sits above the seeded range', async () => {
      const [{ nextId }] = await rows(
        `SELECT AUTO_INCREMENT AS nextId FROM information_schema.tables
          WHERE table_schema = DATABASE() AND table_name = 'org_units'`,
      );
      expect(Number(nextId)).toBeGreaterThan(SEED_LAST_ID);
    });

    it('the seed log row carries the create-shape changes of its entry', async () => {
      const [log] = await rows(
        `SELECT applies_from_year, backdated, created_by, changes
           FROM org_unit_change_log WHERE org_unit_id = 82 AND action = 'seed'`,
      );
      expect(Number(log.applies_from_year)).toBe(2026);
      expect(Number(log.backdated)).toBe(0);
      expect(log.created_by).toBeNull();
      const changes =
        typeof log.changes === 'string' ? JSON.parse(log.changes) : log.changes;
      expect(changes).toMatchObject({
        code: { old: null, new: 'ORG-082' },
        name: { old: null, new: 'Technology Integration' },
        acronym: { old: null, new: 'DT' },
        levelId: { old: null, new: 21 },
        parentId: { old: null, new: 48 },
      });
    });
  });

  describe('idempotence (Falsifier 1)', () => {
    it('re-running the seed functions inserts 0 rows and leaves 117 versions / 117 log rows', async () => {
      const { carnets } = await resolveSeedDirectors(runner);
      const before = [
        await scalar(
          `SELECT COUNT(*) FROM org_unit_versions WHERE org_unit_id ${ids}`,
        ),
        await scalar(
          `SELECT COUNT(*) FROM org_unit_change_log WHERE org_unit_id ${ids} AND action = 'seed'`,
        ),
      ];

      expect(await seedOrgUnits(runner)).toBe(0);
      expect(await seedOrgUnitVersions(runner, carnets)).toBe(0);
      expect(await seedOrgUnitChangeLog(runner, carnets)).toBe(0);

      const after = [
        await scalar(
          `SELECT COUNT(*) FROM org_unit_versions WHERE org_unit_id ${ids}`,
        ),
        await scalar(
          `SELECT COUNT(*) FROM org_unit_change_log WHERE org_unit_id ${ids} AND action = 'seed'`,
        ),
      ];
      expect(before).toEqual([117, 117]);
      expect(after).toEqual(before);
    });

    // Statements a runner saw, so a test can assert on the SQL that ran (KZ-001).
    const recording = (real: QueryRunner) => {
      const calls: string[] = [];
      const wrapped = {
        query: (sql: string, params?: any[]) => {
          calls.push(sql);
          return real.query(sql, params);
        },
      } as unknown as QueryRunner;
      return { wrapped, calls };
    };
    const isDdl = (sql: string) =>
      /^\s*(ALTER|CREATE|DROP|TRUNCATE)\b/i.test(sql);

    it('re-running the WHOLE seed (guards, inserts, checks) is clean and issues NO DDL', async () => {
      // DDL from a parallel Jest worker took exclusive metadata locks and
      // deadlocked the other org suites (T-05 attempt 2): a re-run must not
      // issue any.
      const { wrapped, calls } = recording(runner);
      const result = await seedOrgStructure(wrapped);
      expect([result.units, result.versions, result.logRows]).toEqual([
        0, 0, 0,
      ]);
      expect(calls.length).toBeGreaterThan(300); // it really ran
      expect(calls.filter(isDdl)).toEqual([]);
    });

    it('re-running the Control Lists values seed issues NO DDL either (org_unit_versions.level_value_id references that table)', async () => {
      const { wrapped, calls } = recording(runner);
      expect(await seedControlListValues(wrapped)).toBe(0);
      expect(calls.filter(isDdl)).toEqual([]);
    });
  });

  describe('precondition and post-condition guards (reviewer advisory 1)', () => {
    const seededUnits = Array.from({ length: SEED_LAST_ID }, (_, i) => ({
      id: i + 1,
      code: `ORG-${String(i + 1).padStart(3, '0')}`,
      seeded: true,
    }));

    it('passes on an empty database and on a fully seeded one (a re-run), including admin entries above 117 and an edited seeded code', () => {
      expect(
        findOrgSeedPreconditionProblems({
          unitCount: 0,
          seedLogCount: 0,
          lowIdUnits: [],
        }),
      ).toEqual([]);
      expect(
        findOrgSeedPreconditionProblems({
          unitCount: 120,
          seedLogCount: 117,
          lowIdUnits: [
            ...seededUnits.slice(0, 5),
            { id: 6, code: 'RENAMED-6', seeded: true },
            ...seededUnits.slice(6),
          ],
        }),
      ).toEqual([]);
    });

    it('flags entries created before the seed (rows, no seed log row) and a foreign entry holding a seeded id', () => {
      const first = findOrgSeedPreconditionProblems({
        unitCount: 1,
        seedLogCount: 0,
        lowIdUnits: [{ id: 1, code: 'ADMIN-1', seeded: false }],
      });
      expect(first).toHaveLength(2);
      expect(first[0]).toMatch(/no "seed" log row exists/);
      expect(first[1]).toMatch(/id 1 holds code "ADMIN-1"/);

      const second = findOrgSeedPreconditionProblems({
        unitCount: 118,
        seedLogCount: 117,
        lowIdUnits: [
          { id: 1, code: 'ORG-001', seeded: true },
          { id: 2, code: 'MINE', seeded: false },
        ],
      });
      expect(second).toHaveLength(1);
      expect(second[0]).toMatch(/id 2 holds code "MINE"/);
    });

    it('a foreign entry makes seedOrgStructure throw BEFORE any write (nothing is inserted, altered or deleted)', async () => {
      const calls: string[] = [];
      const fake = {
        query: async (sql: string) => {
          calls.push(sql);
          if (sql.includes('AS unit_count')) {
            return [{ unit_count: 1, seed_count: 0 }];
          }
          if (sql.includes('AS seeded')) {
            return [{ id: 1, code: 'ADMIN-1', seeded: 0 }];
          }
          if (sql.includes('alliance_user_staff')) return []; // no staff
          return { affectedRows: 0 };
        },
      } as unknown as QueryRunner;

      const outcome = await seedOrgStructure(fake).then(
        () => 'resolved',
        (error: Error) => error.message,
      );
      // The write check comes first: without the guard the seed would reach its
      // INSERTs, and that is what this test must see go red.
      const writes = calls.filter((sql) =>
        /^\s*(INSERT|UPDATE|DELETE|ALTER|CREATE|DROP|TRUNCATE)\b/i.test(sql),
      );
      expect(writes).toEqual([]);
      expect(calls).toHaveLength(2); // only the two guard SELECTs ran
      expect(outcome).toMatch(
        /aborted before writing anything.*no "seed" log row exists/,
      );
    });

    it('the guards pass against the real, seeded database', async () => {
      await expect(assertOrgSeedPreconditions(runner)).resolves.toBeUndefined();
      await expect(
        assertOrgSeedPostconditions(runner),
      ).resolves.toBeUndefined();
    });

    it('the post-condition names every count that is not 117 / 117 / 117', () => {
      expect(
        findOrgSeedPostconditionProblems({
          units: 117,
          versions: 117,
          seedLogRows: 117,
        }),
      ).toEqual([]);
      expect(
        findOrgSeedPostconditionProblems({
          units: 116,
          versions: 117,
          seedLogRows: 100,
        }),
      ).toEqual([
        '116 seeded entries, expected 117',
        '100 seed log rows, expected 117',
      ]);
    });
  });

  describe('directors (seed report and Falsifier 2)', () => {
    it('prints the seed report; stored carnets are the real matches, never the mockup carnets', async () => {
      const { report } = await resolveSeedDirectors(runner);
      expect(report).toHaveLength(11);

      console.log(
        [
          '[org-structure-seed] SEED REPORT (director per node, resolved on the local staff table)',
          ...report.map(
            (r) =>
              `  ${r.code} "${r.unitName}" | mockup ${r.mockupKey} ${r.mockupName} <${r.email}> | ${r.outcome}` +
              (r.carnet ? ` -> carnet ${r.carnet} (${r.staffName})` : ''),
          ),
          `  matched ${report.filter((r) => r.outcome === 'matched').length} of ${report.length}`,
        ].join('\n'),
      );

      for (const r of report) {
        const [stored] = await rows(
          `SELECT director_carnet FROM org_unit_versions WHERE org_unit_id = ${r.unitId}`,
        );
        // Stored value is what the report says: the real carnet, or NULL.
        expect(stored.director_carnet).toBe(r.carnet);
        if (r.carnet) {
          const staff = await rows(
            `SELECT carnet FROM alliance_user_staff WHERE carnet = '${r.carnet}'`,
          );
          expect(staff).toHaveLength(1);
        }
      }
      // Nodes without a director in the mockup stay NULL.
      expect(
        await scalar(
          `SELECT COUNT(*) FROM org_unit_versions
            WHERE org_unit_id ${ids} AND director_carnet IS NOT NULL`,
        ),
      ).toBe(report.filter((r) => r.carnet !== null).length);
    });

    it('email wins over name: a staff row with the same NAME but a different email is not matched', async () => {
      const byEmail = await fixtures.staff('EM', 'Other', 'Person', true); // email em@example.org
      const byName = await fixtures.staff('NM', 'Zed', 'Probe', true); // email nm@example.org

      const probe: SeedEntry[] = [[9999, 23, null, 'Probe unit', null, 'P1']];
      const { carnets, report } = await resolveSeedDirectors(
        runner,
        { P1: { name: 'Zed Probe', email: 'EM@Example.org' } }, // case-insensitive email
        probe,
      );
      expect(carnets.get('P1')).toBe(byEmail);
      expect(carnets.get('P1')).not.toBe(byName);
      expect(report[0]).toMatchObject({ outcome: 'matched', carnet: byEmail });
    });

    it('falls back to the exact first + last name when no email matches', async () => {
      const byName = await fixtures.staff('N2', 'Quill', 'Marrow', true);
      const probe: SeedEntry[] = [[9999, 23, null, 'Probe unit', null, 'P2']];
      const { carnets } = await resolveSeedDirectors(
        runner,
        { P2: { name: 'Quill Marrow', email: 'nobody@example.org' } },
        probe,
      );
      expect(carnets.get('P2')).toBe(byName);

      const near = await resolveSeedDirectors(
        runner,
        { P2: { name: 'Quill Marro', email: 'nobody@example.org' } },
        probe,
      );
      expect(near.carnets.get('P2')).toBeNull();
      expect(near.report[0].outcome).toBe('no match');
    });

    it('several staff rows with the same email match nothing and are reported', async () => {
      const a = {
        carnet: 'X1',
        first_name: 'A',
        last_name: 'B',
        email: 'd@x.org',
        is_active: 1,
      };
      const b = {
        carnet: 'X2',
        first_name: 'C',
        last_name: 'D',
        email: 'D@X.ORG',
        is_active: 1,
      };
      const result = matchDirector([a, b], { name: 'A B', email: 'd@x.org' });
      // The ambiguous email is not resolved by falling back to the name.
      expect(result).toEqual({
        outcome: 'several',
        carnet: null,
        staffName: null,
      });
    });

    it('inactive staff are not candidates but are reported as such', () => {
      const inactive = {
        carnet: 'X1',
        first_name: 'A',
        last_name: 'B',
        email: 'd@x.org',
        is_active: 0,
      };
      expect(
        matchDirector([inactive], { name: 'A B', email: 'd@x.org' }),
      ).toEqual({
        outcome: 'inactive staff only',
        carnet: null,
        staffName: null,
      });
      expect(matchDirector([], { name: 'A B', email: 'd@x.org' }).outcome).toBe(
        'no match',
      );
    });
  });

  describe('migration file shape (Falsifier 3 guard)', () => {
    it('exports ONLY its migration class (a seed function export breaks every migration command)', () => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const exported = require('../src/db/migrations/1791000000004-seedOrgStructure');
      expect(Object.keys(exported)).toEqual(['SeedOrgStructure1791000000004']);
    });
  });
});
