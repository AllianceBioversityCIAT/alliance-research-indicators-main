import 'reflect-metadata';
import 'dotenv/config';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { DataSource, EntityManager } from 'typeorm';
import { SecRolesEnum } from '../src/domain/shared/enum/sec_role.enum';
import {
  bootStrategyFrameworkApp,
  createStfDataSource,
  whileHoldingPortfolio,
  StrategyFrameworkFixtures,
} from './support/strategy-framework-fixtures';

/**
 * Carry forward on the real scratch
 * (R-STF-010 AC.1/AC.2, NFR-STF-002, design §5.5).
 *
 * The injected failure replaces `EntityManager.insert` after the first row
 * of that transaction. The concurrent pair is held until both wait on the
 * portfolio lock. Scope (KZ-017): local scratch only.
 */
describe('Strategy framework — carry forward (T-10)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let fixtures: StrategyFrameworkFixtures;
  const admin = {
    'x-test-roles': JSON.stringify([SecRolesEnum.ODS_ADMIN]),
  };

  beforeAll(async () => {
    dataSource = await createStfDataSource('strategy-framework-carry-forward');
    fixtures = new StrategyFrameworkFixtures(dataSource);
    app = await bootStrategyFrameworkApp(dataSource);
  }, 120000);

  afterAll(async () => {
    try {
      await fixtures?.cleanup();
    } finally {
      if (app) await app.close();
      if (dataSource?.isInitialized) await dataSource.destroy();
    }
  });

  const yearCount = async (portfolioId: number, year: number) => {
    const [row] = await dataSource.query(
      `SELECT COUNT(*) AS n FROM institutional_objectives WHERE portfolio_id = ? AND year = ?`,
      [portfolioId, year],
    );
    return Number(row.n);
  };

  const seedYear = async (portfolioId: number) => {
    const area = await request(app.getHttpServer())
      .post('/elements')
      .set(admin)
      .send({ portfolioId, code: '1', name: 'Area' });
    const dimension = await request(app.getHttpServer())
      .post('/elements')
      .set(admin)
      .send({
        portfolioId,
        parentId: area.body.data.id,
        code: '1.1',
        name: 'Dimension',
      });
    const indicator = await request(app.getHttpServer())
      .post('/elements')
      .set(admin)
      .send({
        portfolioId,
        parentId: dimension.body.data.id,
        code: '1.1.1',
        name: 'Indicator',
      });
    expect(indicator.status).toBe(201);
    for (const code of ['IOB-1', 'IOB-2']) {
      const created = await request(app.getHttpServer())
        .post('/objectives')
        .set(admin)
        .send({
          portfolioId,
          year: 2026,
          code,
          statement: `Statement ${code}`,
          elementIds: [indicator.body.data.id],
        });
      expect(created.status).toBe(201);
    }
  };

  const carry = (portfolioId: number, fromYear: number) =>
    request(app.getHttpServer())
      .post('/objectives/carry-forward')
      .set(admin)
      .send({ portfolioId, fromYear });

  it('R-STF-010 AC.1: copies code, statement and links and leaves the source year untouched', async () => {
    const portfolioId = await fixtures.portfolio('CF1');
    await seedYear(portfolioId);
    const res = await carry(portfolioId, 2026);
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual({ fromYear: 2026, toYear: 2027, copied: 2 });

    const rows: Array<{
      year: number;
      code: string;
      statement: string;
      elementCode: string;
    }> = await dataSource.query(
      `SELECT io.year AS year, io.code AS code, io.statement AS statement, fe.code AS elementCode
         FROM institutional_objectives io
         JOIN institutional_objective_elements ioe ON ioe.institutional_objective_id = io.id
         JOIN framework_elements fe ON fe.id = ioe.element_id
        WHERE io.portfolio_id = ?
        ORDER BY io.year, io.code`,
      [portfolioId],
    );
    expect(rows).toEqual([
      {
        year: 2026,
        code: 'IOB-1',
        statement: 'Statement IOB-1',
        elementCode: '1.1.1',
      },
      {
        year: 2026,
        code: 'IOB-2',
        statement: 'Statement IOB-2',
        elementCode: '1.1.1',
      },
      {
        year: 2027,
        code: 'IOB-1',
        statement: 'Statement IOB-1',
        elementCode: '1.1.1',
      },
      {
        year: 2027,
        code: 'IOB-2',
        statement: 'Statement IOB-2',
        elementCode: '1.1.1',
      },
    ]);
  });

  it('R-STF-010 AC.2: a target year that already has objectives is 409 and writes nothing more; the last year is 400', async () => {
    const portfolioId = await fixtures.portfolio('CF2');
    await seedYear(portfolioId);
    const first = await carry(portfolioId, 2026);
    expect(first.status).toBe(200);
    const before = await yearCount(portfolioId, 2027);
    const again = await carry(portfolioId, 2026);
    expect(again.status).toBe(409);
    expect(await yearCount(portfolioId, 2027)).toBe(before);
    expect(await yearCount(portfolioId, 2026)).toBe(2);

    const last = await carry(portfolioId, 2030);
    expect(last.status).toBe(400);
    const empty = await carry(portfolioId, 2028);
    expect(empty.status).toBe(400);
  });

  it('NFR-STF-002: an injected failure inside the copy leaves zero rows in the target year', async () => {
    const portfolioId = await fixtures.portfolio('CF3');
    await seedYear(portfolioId);
    const original = dataSource.transaction.bind(dataSource);
    dataSource.transaction = (async <T>(
      work: (manager: EntityManager) => Promise<T>,
    ) =>
      original(async (manager) => {
        const insert = manager.insert.bind(manager);
        let inserts = 0;
        manager.insert = (async (
          ...args: Parameters<EntityManager['insert']>
        ) => {
          inserts += 1;
          if (inserts > 1) throw new Error('injected carry-forward failure');
          return insert(...args);
        }) as EntityManager['insert'];
        return work(manager);
      })) as DataSource['transaction'];
    try {
      const res = await carry(portfolioId, 2026);
      expect(res.status).toBeGreaterThanOrEqual(500);
    } finally {
      dataSource.transaction = original;
    }
    expect(await yearCount(portfolioId, 2027)).toBe(0);
    expect(await yearCount(portfolioId, 2026)).toBe(2);
  });

  it('two simultaneous carry forwards yield one 409 and no 500', async () => {
    const portfolioId = await fixtures.portfolio('CF4');
    await seedYear(portfolioId);
    const startedAt: number[] = [];
    const barrier = await whileHoldingPortfolio(dataSource, portfolioId, () => {
      startedAt.push(Date.now());
      const first = carry(portfolioId, 2026);
      startedAt.push(Date.now());
      const second = carry(portfolioId, 2026);
      return Promise.all([first, second]);
    });
    const [left, right] = barrier.result;
    const statuses = [left.status, right.status].sort((a, b) => a - b);
    console.log(
      `[strategy-framework-carry-forward] two carries statuses=${statuses.join(',')} target=${await yearCount(portfolioId, 2027)} waiters=${barrier.waiters}`,
    );
    expect(barrier.waiters).toBeGreaterThanOrEqual(2);
    expect(startedAt.every((at) => at < barrier.releasedAt)).toBe(true);
    expect(statuses).toEqual([200, 409]);
    expect(statuses).not.toContain(500);
    expect(await yearCount(portfolioId, 2027)).toBe(2);
    expect(await yearCount(portfolioId, 2026)).toBe(2);
  }, 30000);
});
