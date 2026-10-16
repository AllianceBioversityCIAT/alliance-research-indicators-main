import {
  ArgumentMetadata,
  BadRequestException,
  ValidationPipe,
} from '@nestjs/common';
import { GlobalExceptions } from '../../shared/error-management/global.exception';
import { LoggerUtil } from '../../shared/utils/logger.util';
import { OrgStructureService } from './organizational-structure.service';
import { CreateOrgUnitDto } from './dto/create-org-unit.dto';
import { SearchStaffQueryDto } from './dto/search-staff-query.dto';

/**
 * The real wire contract of the write half (KZ-017): what the CLIENT receives
 * is what `GlobalExceptions` makes of the exception the service throws, and the
 * integration harness does not mount it. The REAL service throws (repository
 * and lookup stubbed), the REAL filter formats.
 */
describe('Organizational Structure — real GlobalExceptions contract for writes (T-02)', () => {
  let filter: GlobalExceptions;
  const spies: jest.SpyInstance[] = [];

  const store = {
    transaction: jest.fn((work: (m: unknown) => unknown) => work({})),
    codeTaken: jest.fn(),
    findStaff: jest.fn().mockResolvedValue([]),
    loadGraphVersions: jest.fn().mockResolvedValue([]),
    findUnit: jest.fn(),
    lockUnit: jest.fn(),
  };
  const lookup = { assertValueInList: jest.fn() };
  const service = new OrgStructureService(
    store as never,
    {} as never,
    lookup as never,
    { currentYear: () => 2026 },
    { user_id: 1 } as never,
  );
  const dto = (over: Partial<CreateOrgUnitDto> = {}) =>
    ({
      levelId: 23,
      name: 'N',
      parentId: 2,
      appliesFromYear: 2026,
      ...over,
    }) as CreateOrgUnitDto;

  const run = async (action: () => Promise<unknown>) => {
    const json = jest.fn();
    const status = jest.fn().mockReturnValue({ json });
    const host = {
      switchToHttp: () => ({
        getResponse: () => ({ status }),
        getRequest: () => ({
          url: '/api/organizational-structure/units',
          method: 'POST',
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

  it('a level of another list -> 400 whose errors name `level`', async () => {
    lookup.assertValueInList.mockRejectedValue(
      new BadRequestException('Value 7 belongs to list "kpi.direction"'),
    );
    const { status, body } = await run(() =>
      service.create(dto({ levelId: 7 })),
    );
    expect(status).toHaveBeenCalledWith(400);
    expect(body).toMatchObject({
      description: 'BadRequestException',
      status: 400,
      errors: {
        field: 'level',
        description: expect.stringContaining('levelId 7'),
      },
    });
  });

  it('an unknown parent -> 404 whose errors name `parent`', async () => {
    lookup.assertValueInList.mockResolvedValue({});
    store.findUnit.mockResolvedValue(null);
    const { status, body } = await run(() => service.create(dto()));
    expect(status).toHaveBeenCalledWith(404);
    expect(body).toMatchObject({
      description: 'NotFoundException',
      errors: { field: 'parent' },
    });
  });

  it('a duplicate code -> 409 whose errors name `code`', async () => {
    lookup.assertValueInList.mockResolvedValue({});
    store.findUnit.mockResolvedValue({ id: 2 });
    store.codeTaken.mockResolvedValue(true);
    const { status, body } = await run(() =>
      service.create(
        dto({ levelId: 20, parentId: undefined, code: 'ORG-050' }),
      ),
    );
    expect(status).toHaveBeenCalledWith(409);
    expect(body).toMatchObject({
      description: 'ConflictException',
      status: 409,
      errors: {
        field: 'code',
        description: expect.stringContaining('ORG-050'),
      },
    });
  });

  it('a deleted entry -> 409 with a description and no field; an unknown entry -> 404 plain string', async () => {
    store.lockUnit.mockResolvedValueOnce({
      id: 9,
      status: 'deleted',
      code: 'X',
    });
    const deleted = await run(() => service.update(9, { code: 'ORG-9' }));
    expect(deleted.status).toHaveBeenCalledWith(409);
    expect(deleted.body.errors).toEqual({
      description: expect.stringContaining('deleted'),
    });

    store.lockUnit.mockResolvedValueOnce(null);
    const missing = await run(() => service.update(404, { code: 'ORG-9' }));
    expect(missing.status).toHaveBeenCalledWith(404);
    expect(missing.body.errors).toBe('Organizational unit 404 not found');
  });

  describe('body and query validation through a real ValidationPipe', () => {
    const pipe = new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    });
    const body: ArgumentMetadata = { type: 'body', metatype: CreateOrgUnitDto };

    it.each(['portfolioId', 'id', 'directorName', 'directorEmail'])(
      'a body with `%s` -> 400 "property %s should not exist"',
      async (field) => {
        const { status, body: res } = await run(() =>
          pipe.transform(
            { levelId: 20, name: 'N', appliesFromYear: 2026, [field]: 1 },
            body,
          ),
        );
        expect(status).toHaveBeenCalledWith(400);
        expect(res.errors).toEqual(
          expect.arrayContaining([
            expect.stringContaining(`property ${field} should not exist`),
          ]),
        );
      },
    );

    it('B4 with a 1-character or missing search -> 400; with 2 characters it passes', async () => {
      const meta: ArgumentMetadata = {
        type: 'query',
        metatype: SearchStaffQueryDto,
      };
      for (const query of [{ search: 'a' }, { search: ' a ' }, {}]) {
        const { status } = await run(() => pipe.transform(query, meta));
        expect(status).toHaveBeenCalledWith(400);
        jest.clearAllMocks();
      }
      await expect(
        pipe.transform({ search: ' pe ' }, meta),
      ).resolves.toMatchObject({ search: 'pe' });
    });
  });
});
