import 'reflect-metadata';
import 'dotenv/config';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { SecRolesEnum } from '../src/domain/shared/enum/sec_role.enum';
import {
  bootStrategyFrameworkApp,
  createStfDataSource,
  whileHoldingPortfolio,
  StrategyFrameworkFixtures,
} from './support/strategy-framework-fixtures';

/**
 * Levels as data, and the portfolio lock
 * (R-STF-002 AC.1, design §5.2 step 6, T-06 forward pointer).
 *
 * Two first creates, and an IOB update against a create, are started together
 * and held until both are lock waiters. Scope (KZ-017): the waiter count is
 * `performance_schema.data_lock_waits` on this scratch, not a proof about
 * Dev's lock-wait timeout.
 */
describe('Strategy framework — levels and the portfolio lock (T-10)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let fixtures: StrategyFrameworkFixtures;
  const admin = {
    'x-test-roles': JSON.stringify([SecRolesEnum.ODS_ADMIN]),
  };

  beforeAll(async () => {
    dataSource = await createStfDataSource('strategy-framework-levels');
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

  const postElement = (body: Record<string, unknown>) =>
    request(app.getHttpServer()).post('/elements').set(admin).send(body);

  it('R-STF-002 AC.1: a fourth level inserted by the fixture appears in A1 and A1e', async () => {
    const portfolioId = await fixtures.portfolio('LVL4');
    const area = await postElement({ portfolioId, code: '1', name: 'Area' });
    const dimension = await postElement({
      portfolioId,
      parentId: area.body.data.id,
      code: '1.1',
      name: 'Dimension',
    });
    const indicator = await postElement({
      portfolioId,
      parentId: dimension.body.data.id,
      code: '1.1.1',
      name: 'Indicator',
    });
    expect(indicator.status).toBe(201);

    await dataSource.query(
      `INSERT INTO framework_levels
         (portfolio_id, depth, name, plural_name, short_label, is_indicator_level, created_at)
       VALUES (?, 4, 'Subindicator', 'Subindicators', 'SUB', 0, NOW())`,
      [portfolioId],
    );
    const leaf = await postElement({
      portfolioId,
      parentId: indicator.body.data.id,
      code: '1.1.1.1',
      name: 'Leaf',
    });
    expect(leaf.status).toBe(201);
    expect(leaf.body.data.depth).toBe(4);

    const read = await request(app.getHttpServer())
      .get(`/framework?portfolioId=${portfolioId}`)
      .set(admin);
    const editor = await request(app.getHttpServer())
      .get(`/framework/editor?portfolioId=${portfolioId}`)
      .set(admin);
    expect(read.status).toBe(200);
    expect(editor.status).toBe(200);

    const readLevels = read.body.data.levels.map(
      (level: { depth: number; name: string }) => ({
        depth: level.depth,
        name: level.name,
      }),
    );
    expect(readLevels).toEqual(
      expect.arrayContaining([
        { depth: 4, name: 'Subindicator' },
        { depth: 1, name: 'Performance Area' },
      ]),
    );
    expect(
      read.body.data.elements.map((row: { code: string }) => row.code),
    ).toContain('1.1.1.1');
    expect(read.body.data.usageLabels).toBeUndefined();
    expect(read.body.data.elements[0].deletable).toBeUndefined();

    const editorLevel = editor.body.data.levels.find(
      (level: { depth: number }) => level.depth === 4,
    );
    expect(editorLevel.name).toBe('Subindicator');
    expect(editorLevel.pluralName).toBe('Subindicators');
    expect(editor.body.data.usageLabels).toEqual([]);
  });

  it('two simultaneous first creates on an empty portfolio produce one level set', async () => {
    const portfolioId = await fixtures.portfolio('LOCK');
    const startedAt: number[] = [];
    const barrier = await whileHoldingPortfolio(dataSource, portfolioId, () => {
      startedAt.push(Date.now());
      const first = postElement({ portfolioId, code: 'A', name: 'First' });
      startedAt.push(Date.now());
      const second = postElement({ portfolioId, code: 'B', name: 'Second' });
      return Promise.all([first, second]);
    });
    const [left, right] = barrier.result;
    const statuses = [left.status, right.status].sort();
    const [levels] = await dataSource.query(
      `SELECT COUNT(*) AS n FROM framework_levels WHERE portfolio_id = ?`,
      [portfolioId],
    );
    const depths: Array<{ depth: number }> = await dataSource.query(
      `SELECT depth FROM framework_levels WHERE portfolio_id = ? ORDER BY depth`,
      [portfolioId],
    );
    console.log(
      `[strategy-framework-levels] two first creates statuses=${statuses.join(',')} levels=${levels.n} depths=${depths.map((row) => row.depth).join(',')} waiters=${barrier.waiters} startedBeforeRelease=${startedAt.every((at) => at < barrier.releasedAt)}`,
    );
    expect(barrier.waiters).toBeGreaterThanOrEqual(2);
    expect(startedAt.every((at) => at < barrier.releasedAt)).toBe(true);
    expect(statuses).toEqual([201, 201]);
    expect(Number(levels.n)).toBe(3);
    expect(depths.map((row) => row.depth)).toEqual([1, 2, 3]);
  }, 30000);

  it('an IOB update and an element create on the same portfolio do not deadlock or 500', async () => {
    const portfolioId = await fixtures.portfolio('RACE');
    const area = await postElement({ portfolioId, code: '1', name: 'Area' });
    const dimension = await postElement({
      portfolioId,
      parentId: area.body.data.id,
      code: '1.1',
      name: 'Dimension',
    });
    const indicator = await postElement({
      portfolioId,
      parentId: dimension.body.data.id,
      code: '1.1.1',
      name: 'Indicator',
    });
    const objective = await request(app.getHttpServer())
      .post('/objectives')
      .set(admin)
      .send({
        portfolioId,
        year: 2026,
        code: 'IOB-1',
        statement: 'Before',
        elementIds: [indicator.body.data.id],
      });
    expect(objective.status).toBe(201);

    const startedAt: number[] = [];
    const barrier = await whileHoldingPortfolio(dataSource, portfolioId, () => {
      startedAt.push(Date.now());
      const update = request(app.getHttpServer())
        .patch(`/objectives/${objective.body.data.id}`)
        .set(admin)
        .send({ statement: 'After' });
      startedAt.push(Date.now());
      const create = postElement({ portfolioId, code: '2', name: 'Alongside' });
      return Promise.all([update, create]);
    });
    const [updated, created] = barrier.result;
    console.log(
      `[strategy-framework-levels] update vs create statuses=${updated.status},${created.status} waiters=${barrier.waiters}`,
    );
    expect(barrier.waiters).toBeGreaterThanOrEqual(2);
    expect(startedAt.every((at) => at < barrier.releasedAt)).toBe(true);
    expect(updated.status).not.toBe(500);
    expect(created.status).not.toBe(500);
    expect(JSON.stringify(updated.body)).not.toMatch(/deadlock/i);
    expect(JSON.stringify(created.body)).not.toMatch(/deadlock/i);
    expect(updated.status).toBe(200);
    expect(created.status).toBe(201);
  }, 30000);
});
