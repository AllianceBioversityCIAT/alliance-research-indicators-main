import { ArgumentMetadata, ValidationPipe } from '@nestjs/common';
import { GlobalExceptions } from '../../shared/error-management/global.exception';
import { LoggerUtil } from '../../shared/utils/logger.util';
import { OrgStructureService } from './organizational-structure.service';
import { OrgUnitUsageRegistry } from './org-unit-usage.registry';
import { InactivateOrgUnitDto } from './dto/inactivate-org-unit.dto';
import { ReactivateOrgUnitDto } from './dto/reactivate-org-unit.dto';
import { DeleteOrgUnitQueryDto } from './dto/delete-org-unit-query.dto';
import { ChangeLogQueryDto } from './dto/change-log-query.dto';

/**
 * The real wire contract of the lifecycle half (KZ-017): the CLIENT receives
 * what GlobalExceptions makes of the exception the service throws, and the
 * integration harness does not mount it. The REAL service throws (store
 * stubbed), the REAL filter formats, and the REAL DTOs go through a REAL
 * ValidationPipe.
 */
describe('Organizational Structure — real GlobalExceptions contract for the lifecycle (T-03)', () => {
  let filter: GlobalExceptions;
  const spies: jest.SpyInstance[] = [];

  const store = {
    transaction: jest.fn((work: (m: unknown) => unknown) => work({})),
    lockUnit: jest.fn(),
    loadVersions: jest.fn(),
    loadGraphVersions: jest.fn().mockResolvedValue([]),
    findUnit: jest.fn(),
    findSuccessorReferrers: jest.fn().mockResolvedValue([]),
  };
  const registry = new OrgUnitUsageRegistry();
  const service = new OrgStructureService(
    store as never,
    {} as never,
    {} as never,
    { currentYear: () => 2026 },
    { user_id: 1 } as never,
    registry,
  );

  const run = async (action: () => Promise<unknown>, method = 'POST') => {
    const json = jest.fn();
    const status = jest.fn().mockReturnValue({ json });
    const host = {
      switchToHttp: () => ({
        getResponse: () => ({ status }),
        getRequest: () => ({
          url: '/api/organizational-structure/units/4/inactivate',
          method,
        }),
      }),
    };
    try {
      await action();
    } catch (exception) {
      filter.catch(exception, host as never);
    }
    return { status, body: json.mock.calls[0]?.[0] };
  };

  beforeAll(() => {
    spies.push(
      jest.spyOn(LoggerUtil.prototype, '_error').mockImplementation(),
      jest.spyOn(LoggerUtil.prototype, '_warn').mockImplementation(),
    );
    filter = new GlobalExceptions();
  });
  afterAll(() => spies.forEach((spy) => spy.mockRestore()));
  beforeEach(() => jest.clearAllMocks());

  it('an unknown entry -> 404 whose errors is the plain string, the SAME text as B5 and B10', async () => {
    store.lockUnit.mockResolvedValue(null);
    for (const action of [
      () => service.inactivate(404, { fromYear: 2027 }),
      () => service.reactivate(404, { fromYear: 2027 }),
      () => service.remove(404, {}),
    ]) {
      const { status, body } = await run(action);
      expect(status).toHaveBeenCalledWith(404);
      expect(body).toMatchObject({
        description: 'NotFoundException',
        status: 404,
        errors: 'Organizational unit 404 not found',
      });
    }
  });

  it('a deleted entry -> 409 whose errors is { description } with no field, on all three actions', async () => {
    store.lockUnit.mockResolvedValue({ id: 9, code: 'X', status: 'deleted' });
    for (const action of [
      () => service.inactivate(9, { fromYear: 2027 }),
      () => service.reactivate(9, { fromYear: 2027 }),
      () => service.remove(9, {}),
    ]) {
      const { status, body } = await run(action);
      expect(status).toHaveBeenCalledWith(409);
      expect(body.errors).toEqual({
        description: expect.stringContaining('deleted'),
      });
    }
  });

  it('active children -> 409 { description } naming the children and proposing to move or inactivate them', async () => {
    store.lockUnit.mockResolvedValue({
      id: 2,
      code: 'ORG-002',
      status: 'active',
    });
    store.loadVersions.mockResolvedValue([
      { id: 1, from: 2026, to: null, levelId: 21, parentId: 1 },
    ]);
    store.loadGraphVersions.mockResolvedValue([
      { unitId: 4, from: 2026, to: null, parentId: 2, levelId: 23 },
    ]);
    store.findUnit.mockResolvedValue({ id: 4, code: 'ORG-061' });
    const { status, body } = await run(() =>
      service.inactivate(2, { fromYear: 2027 }),
    );
    expect(status).toHaveBeenCalledWith(409);
    expect(body).toMatchObject({
      description: 'ConflictException',
      errors: { description: expect.stringContaining('ORG-061') },
    });
    expect(body.errors.description).toContain('Move or inactivate');
  });

  it('linked records -> 409 { description } stating the count and proposing Inactivate', async () => {
    registry.register({
      consumerName: 'KPI values',
      countByUnitIds: async (ids) => ({ [ids[0]]: 5 }),
    });
    store.lockUnit.mockResolvedValue({
      id: 57,
      code: 'ORG-057',
      status: 'active',
    });
    store.loadVersions.mockResolvedValue([
      { id: 1, from: 2026, to: null, levelId: 23, parentId: 2 },
    ]);
    store.loadGraphVersions.mockResolvedValue([]);
    const { status, body } = await run(() => service.remove(57, {}), 'DELETE');
    expect(status).toHaveBeenCalledWith(409);
    expect(body.errors.description).toContain('5 linked records');
    expect(body.errors.description).toContain('Inactivate');
  });

  it('a missing back-date flag -> 400 { field: backdate }; a bad successor -> 400 { field: successor }', async () => {
    const backdate = await run(() => service.inactivate(4, { fromYear: 2025 }));
    expect(backdate.status).toHaveBeenCalledWith(400);
    expect(backdate.body.errors.field).toBe('backdate');

    store.lockUnit.mockResolvedValue({
      id: 4,
      code: 'ORG-061',
      status: 'active',
    });
    store.loadVersions.mockResolvedValue([
      { id: 1, from: 2026, to: null, levelId: 23, parentId: 2 },
    ]);
    store.loadGraphVersions.mockResolvedValue([]);
    store.findUnit.mockResolvedValue(null);
    const successor = await run(() =>
      service.inactivate(4, { fromYear: 2027, successorId: 999 }),
    );
    expect(successor.status).toHaveBeenCalledWith(400);
    expect(successor.body.errors).toEqual({
      field: 'successor',
      description: expect.stringContaining('999'),
    });
  });

  describe('body and query validation through a real ValidationPipe', () => {
    const pipe = new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    });
    const meta = (
      type: 'body' | 'query',
      metatype: ArgumentMetadata['metatype'],
    ): ArgumentMetadata => ({ type, metatype });

    it('B11: fromYear is required; id, status or portfolioId in the body -> 400', async () => {
      const m = meta('body', InactivateOrgUnitDto);
      const empty = await run(() => pipe.transform({}, m));
      expect(empty.status).toHaveBeenCalledWith(400);
      for (const field of ['id', 'status', 'portfolioId']) {
        const { status, body } = await run(() =>
          pipe.transform({ fromYear: 2027, [field]: 1 }, m),
        );
        expect(status).toHaveBeenCalledWith(400);
        expect(body.errors).toEqual(
          expect.arrayContaining([
            expect.stringContaining(`property ${field} should not exist`),
          ]),
        );
      }
      await expect(
        pipe.transform({ fromYear: 2027, successorId: 60, backdate: true }, m),
      ).resolves.toMatchObject({ fromYear: 2027, successorId: 60 });
      await expect(
        pipe.transform({ fromYear: 2027, successorId: null }, m),
      ).resolves.toMatchObject({ successorId: null });
    });

    it('B12: fromYear is required and must be an integer', async () => {
      const m = meta('body', ReactivateOrgUnitDto);
      for (const body of [{}, { fromYear: 'x' }, { fromYear: 2027.5 }]) {
        const { status } = await run(() => pipe.transform(body, m));
        expect(status).toHaveBeenCalledWith(400);
        jest.clearAllMocks();
      }
      await expect(
        pipe.transform({ fromYear: 2028 }, m),
      ).resolves.toMatchObject({ fromYear: 2028 });
    });

    it('B13: fromYear and backdate come from the query string ("false" stays false); portfolioId -> 400', async () => {
      const m = meta('query', DeleteOrgUnitQueryDto);
      const dto = (await pipe.transform(
        { fromYear: '2027', backdate: 'false' },
        m,
      )) as DeleteOrgUnitQueryDto;
      expect(dto.fromYear).toBe(2027);
      expect(dto.backdate).toBe(false);
      const on = (await pipe.transform(
        { backdate: 'true' },
        m,
      )) as DeleteOrgUnitQueryDto;
      expect(on.backdate).toBe(true);
      const bare = (await pipe.transform({}, m)) as DeleteOrgUnitQueryDto;
      expect(bare.fromYear).toBeUndefined();
      const { status } = await run(
        () => pipe.transform({ portfolioId: '1' }, m),
        'DELETE',
      );
      expect(status).toHaveBeenCalledWith(400);
    });

    it('B7: unitId is required and numeric; with a number it passes', async () => {
      const m = meta('query', ChangeLogQueryDto);
      for (const query of [{}, { unitId: 'abc' }, { unitId: '1', x: '2' }]) {
        const { status } = await run(() => pipe.transform(query, m), 'GET');
        expect(status).toHaveBeenCalledWith(400);
        jest.clearAllMocks();
      }
      await expect(pipe.transform({ unitId: '118' }, m)).resolves.toMatchObject(
        { unitId: 118 },
      );
    });
  });
});
