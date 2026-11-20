import 'reflect-metadata';
import 'dotenv/config';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { FrameworkUsageRegistry } from '../src/domain/entities/strategy-framework/framework-usage.registry';
import { SecRolesEnum } from '../src/domain/shared/enum/sec_role.enum';
import {
  bootStrategyFrameworkApp,
  createStfDataSource,
  StrategyFrameworkFixtures,
} from './support/strategy-framework-fixtures';

/**
 * Element CRUD, move, and delete protection on the real scratch
 * (R-STF-003 AC.1/AC.2, R-STF-006 AC.1/AC.2, design §10 RESTRICT backstop).
 *
 * Scope (KZ-017): status and `message.description` are Nest's default
 * exception body. `GlobalExceptions` is not mounted, so this is not the
 * wire envelope. Only `__T10_` portfolios are written.
 */
describe('Strategy framework — CRUD, move, delete (T-10)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let fixtures: StrategyFrameworkFixtures;
  const admin = {
    'x-test-roles': JSON.stringify([SecRolesEnum.ODS_ADMIN]),
  };

  const messageOf = (body: {
    message?: unknown;
  }): { description: string; field?: string } => {
    const message = body.message;
    if (message && typeof message === 'object' && 'description' in message) {
      const shaped = message as { description: unknown; field?: unknown };
      return {
        description: String(shaped.description),
        field: shaped.field === undefined ? undefined : String(shaped.field),
      };
    }
    return { description: JSON.stringify(body) };
  };

  beforeAll(async () => {
    dataSource = await createStfDataSource('strategy-framework-crud');
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
  const patchElement = (id: number, body: Record<string, unknown>) =>
    request(app.getHttpServer()).patch(`/elements/${id}`).set(admin).send(body);
  const deleteElement = (id: number) =>
    request(app.getHttpServer()).delete(`/elements/${id}`).set(admin);
  const framework = async (portfolioId: number) => {
    const res = await request(app.getHttpServer())
      .get(`/framework?portfolioId=${portfolioId}`)
      .set(admin);
    expect(res.status).toBe(200);
    return res.body.data as {
      elements: Array<{ id: number; code: string; parentId: number | null }>;
    };
  };

  it('R-STF-003 AC.1: creates at each level, renames, and moves with codes unchanged', async () => {
    const portfolioId = await fixtures.portfolio('CRUD1');
    const area1 = await postElement({
      portfolioId,
      code: '1',
      name: 'Area 1',
    });
    const area2 = await postElement({
      portfolioId,
      code: '2',
      name: 'Area 2',
    });
    expect(area1.status).toBe(201);
    expect(area2.status).toBe(201);
    const dimension = await postElement({
      portfolioId,
      parentId: area1.body.data.id,
      code: '1.3',
      name: 'Dimension 1.3',
    });
    const indicator = await postElement({
      portfolioId,
      parentId: dimension.body.data.id,
      code: '1.3.1',
      name: 'Indicator 1.3.1',
    });
    const sibling = await postElement({
      portfolioId,
      parentId: dimension.body.data.id,
      code: '1.3.2',
      name: 'Indicator 1.3.2',
    });
    expect(dimension.status).toBe(201);
    expect(indicator.status).toBe(201);
    expect(sibling.status).toBe(201);

    const renamed = await patchElement(indicator.body.data.id, {
      name: 'Indicator renamed',
    });
    expect(renamed.status).toBe(200);
    expect(renamed.body.data.code).toBe('1.3.1');
    expect(renamed.body.data.name).toBe('Indicator renamed');

    const moved = await patchElement(dimension.body.data.id, {
      parentId: area2.body.data.id,
    });
    expect(moved.status).toBe(200);
    expect(moved.body.data.code).toBe('1.3');
    expect(moved.body.data.parentId).toBe(area2.body.data.id);

    const view = await framework(portfolioId);
    const byCode = new Map(view.elements.map((row) => [row.code, row]));
    expect(byCode.get('1.3')?.parentId).toBe(area2.body.data.id);
    expect(byCode.get('1.3.1')?.parentId).toBe(dimension.body.data.id);
    expect(byCode.get('1.3.2')?.parentId).toBe(dimension.body.data.id);
    expect(byCode.get('1.3.1')?.code).toBe('1.3.1');
  });

  it('R-STF-003 AC.2: wrong-depth parent, other portfolio, null parent, and a parent on depth 1 are 400', async () => {
    const portfolioId = await fixtures.portfolio('CRUD2');
    const otherId = await fixtures.portfolio('CRUD3');
    const area = await postElement({ portfolioId, code: '1', name: 'Area' });
    const otherArea = await postElement({
      portfolioId: otherId,
      code: '9',
      name: 'Other area',
    });
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

    const wrongDepth = await patchElement(dimension.body.data.id, {
      parentId: indicator.body.data.id,
    });
    expect(wrongDepth.status).toBe(400);
    expect(messageOf(wrongDepth.body).field).toBe('parentId');

    const otherPortfolio = await patchElement(dimension.body.data.id, {
      parentId: otherArea.body.data.id,
    });
    expect(otherPortfolio.status).toBe(400);
    expect(messageOf(otherPortfolio.body).field).toBe('parentId');

    const nullParent = await patchElement(indicator.body.data.id, {
      parentId: null,
    });
    expect(nullParent.status).toBe(400);
    expect(messageOf(nullParent.body).field).toBe('parentId');

    const depthOne = await patchElement(area.body.data.id, {
      parentId: otherArea.body.data.id,
    });
    expect(depthOne.status).toBe(400);
    expect(messageOf(depthOne.body).field).toBe('parentId');

    const after = await framework(portfolioId);
    expect(after.elements.find((row) => row.code === '1.1')?.parentId).toBe(
      area.body.data.id,
    );
  });

  it('R-STF-006 AC.1: children, an IOB link, and a registered dependant block delete', async () => {
    const portfolioId = await fixtures.portfolio('CRUD4');
    const area = await postElement({ portfolioId, code: '1', name: 'Area' });
    const dimension = await postElement({
      portfolioId,
      parentId: area.body.data.id,
      code: '1.1',
      name: 'Dimension',
    });
    const linked = await postElement({
      portfolioId,
      parentId: dimension.body.data.id,
      code: '1.1.1',
      name: 'Linked',
    });
    const watched = await postElement({
      portfolioId,
      parentId: dimension.body.data.id,
      code: '1.1.2',
      name: 'Watched',
    });
    expect(watched.status).toBe(201);

    const childBlocked = await deleteElement(dimension.body.data.id);
    expect(childBlocked.status).toBe(409);
    expect(messageOf(childBlocked.body).description).toMatch(/Indicator/i);

    const objective = await request(app.getHttpServer())
      .post('/objectives')
      .set(admin)
      .send({
        portfolioId,
        year: 2026,
        code: 'IOB-1',
        statement: 'One objective',
        elementIds: [linked.body.data.id],
      });
    expect(objective.status).toBe(201);
    const linkBlocked = await deleteElement(linked.body.data.id);
    expect(linkBlocked.status).toBe(409);
    expect(messageOf(linkBlocked.body).description).toMatch(
      /institutional objective/i,
    );

    const registry = app.get(FrameworkUsageRegistry);
    registry.register({
      consumerName: 'KPIs',
      label: 'KPIs',
      countByElementIds: async (ids) => {
        const counts: Record<number, number> = {};
        for (const id of ids) {
          counts[id] = id === watched.body.data.id ? 1 : 0;
        }
        return counts;
      },
    });
    const consumerBlocked = await deleteElement(watched.body.data.id);
    expect(consumerBlocked.status).toBe(409);
    expect(messageOf(consumerBlocked.body).description).toMatch(/KPIs/);
    registry.register({
      consumerName: 'KPIs',
      label: 'KPIs',
      countByElementIds: async (ids) => {
        const counts: Record<number, number> = {};
        for (const id of ids) counts[id] = 0;
        return counts;
      },
    });
  });

  it('R-STF-006 AC.2: a free element disappears from the read and its code can be reused', async () => {
    const portfolioId = await fixtures.portfolio('CRUD5');
    const created = await postElement({
      portfolioId,
      code: '7',
      name: 'Temporary',
    });
    expect(created.status).toBe(201);
    const removed = await deleteElement(created.body.data.id);
    expect(removed.status).toBe(200);
    const view = await framework(portfolioId);
    expect(view.elements.map((row) => row.id)).not.toContain(
      created.body.data.id,
    );
    const again = await postElement({
      portfolioId,
      code: '7',
      name: 'Temporary again',
    });
    expect(again.status).toBe(201);
    expect(again.body.data.code).toBe('7');
  });

  it('RESTRICT backstop: a raw DELETE of an element linked by an IOB is errno 1451 and the row stays', async () => {
    const portfolioId = await fixtures.portfolio('CRUD6');
    const area = await postElement({ portfolioId, code: '1', name: 'Area' });
    const dimension = await postElement({
      portfolioId,
      parentId: area.body.data.id,
      code: '1.2',
      name: 'Dimension',
    });
    const indicator = await postElement({
      portfolioId,
      parentId: dimension.body.data.id,
      code: '1.2.2',
      name: 'Linked indicator',
    });
    const objective = await request(app.getHttpServer())
      .post('/objectives')
      .set(admin)
      .send({
        portfolioId,
        year: 2026,
        code: 'IOB-6',
        statement: 'Linked',
        elementIds: [indicator.body.data.id],
      });
    expect(objective.status).toBe(201);

    await expect(
      dataSource.query(`DELETE FROM framework_elements WHERE id = ?`, [
        indicator.body.data.id,
      ]),
    ).rejects.toMatchObject({ driverError: { errno: 1451 } });

    const [row] = await dataSource.query(
      `SELECT id FROM framework_elements WHERE id = ?`,
      [indicator.body.data.id],
    );
    expect(Number(row.id)).toBe(indicator.body.data.id);
  });
});
