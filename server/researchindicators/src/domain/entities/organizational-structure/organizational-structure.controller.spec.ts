import { HttpStatus, RequestMethod } from '@nestjs/common';
import {
  GUARDS_METADATA,
  METHOD_METADATA,
  PATH_METADATA,
} from '@nestjs/common/constants';
import { DECORATORS } from '@nestjs/swagger/dist/constants';
import { OrganizationalStructureController } from './organizational-structure.controller';
import { OrgStructureReadService } from './org-structure-read.service';
import { OrgStructureService } from './organizational-structure.service';
import { ROLES_KEY } from '../../shared/guards/roles.guard';
import { HumanCredentialGuard } from '../../shared/guards/human-credential.guard';
import { SecRolesEnum } from '../../shared/enum/sec_role.enum';

describe('OrganizationalStructureController (T-01: B1, B2, B5; T-02: B3, B4, B9, B10; T-03: B6, B7, B11, B12, B13; T-04: B8, C1, C2, C3)', () => {
  const readService = {
    getYearView: jest.fn(),
    getYearRange: jest.fn(),
    getUnitDetail: jest.fn(),
    getUnitHistory: jest.fn(),
    getChangeLog: jest.fn(),
    getLinkedData: jest.fn(),
    resolve: jest.fn(),
    ancestors: jest.fn(),
    successors: jest.fn(),
  };
  const service = {
    proposeCode: jest.fn(),
    searchStaff: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    inactivate: jest.fn(),
    reactivate: jest.fn(),
    remove: jest.fn(),
  };
  const controller = new OrganizationalStructureController(
    readService as unknown as OrgStructureReadService,
    service as unknown as OrgStructureService,
  );

  const proto =
    OrganizationalStructureController.prototype as unknown as Record<
      string,
      (...args: unknown[]) => unknown
    >;
  // DISCOVERED, not typed: a handler added later without a decision on roles
  // cannot slip through, and one that loses `@Roles` fails by its own name.
  const handlerNames = Object.getOwnPropertyNames(proto).filter(
    (name) => name !== 'constructor' && typeof proto[name] === 'function',
  );

  // T-04 (R-ORG-012): the consumer reads are the ONLY handlers without roles.
  const consumerHandlerNames = ['resolve', 'getAncestors', 'getSuccessors'];
  const adminHandlerNames = handlerNames.filter(
    (name) => !consumerHandlerNames.includes(name),
  );

  beforeEach(() => jest.clearAllMocks());

  describe('roles metadata (R-ORG-012, NFR-ORG-004)', () => {
    it('discovers exactly the handlers of T-01 to T-04', () => {
      expect(handlerNames).toEqual([
        'getYearView',
        'getCodeProposal',
        'searchStaff',
        'getYears',
        'getChangeLog',
        'resolve',
        'getUnit',
        'getUnitHistory',
        'getLinkedData',
        'getAncestors',
        'getSuccessors',
        'createUnit',
        'updateUnit',
        'inactivateUnit',
        'reactivateUnit',
        'deleteUnit',
      ]);
    });

    it.each(adminHandlerNames)(
      '%s declares exactly [CENTER_ADMIN, SYSTEM_ADMIN]',
      (handlerName) => {
        expect(Reflect.getMetadata(ROLES_KEY, proto[handlerName])).toEqual([
          SecRolesEnum.CENTER_ADMIN,
          SecRolesEnum.SYSTEM_ADMIN,
        ]);
      },
    );

    // R-ORG-012 AC.1 / design 4: C1-C3 are open to any authenticated user. A
    // `@Roles` here, on the handler or inherited from the class, would turn a
    // Contributor's read into a 403 (falsifier 5).
    it.each(consumerHandlerNames)(
      '%s (consumer read) declares NO roles, on the handler or the class',
      (handlerName) => {
        expect(
          Reflect.getMetadata(ROLES_KEY, proto[handlerName]),
        ).toBeUndefined();
        expect(
          Reflect.getMetadata(ROLES_KEY, OrganizationalStructureController),
        ).toBeUndefined();
      },
    );

    it('never grants TECHNICAL_SUPPORT or CONTRIBUTOR', () => {
      for (const handlerName of handlerNames) {
        const roles: SecRolesEnum[] =
          Reflect.getMetadata(ROLES_KEY, proto[handlerName]) ?? [];
        expect(roles).not.toContain(SecRolesEnum.TECHNICAL_SUPPORT);
        expect(roles).not.toContain(SecRolesEnum.CONTRIBUTOR);
      }
    });
  });

  // T-13 (NFR-ORG-004, "no write reachable by machine tokens"): a machine token
  // carries its responsible user's roles, so RolesGuard cannot refuse it. Write
  // handlers are DISCOVERED by HTTP method, so a new write without the guard
  // fails here by name.
  describe('machine credentials (NFR-ORG-004, T-13)', () => {
    const httpMethod = (name: string): RequestMethod =>
      Reflect.getMetadata(METHOD_METADATA, proto[name]);
    const writeHandlerNames = handlerNames.filter(
      (name) => httpMethod(name) !== RequestMethod.GET,
    );
    const readHandlerNames = handlerNames.filter(
      (name) => httpMethod(name) === RequestMethod.GET,
    );
    const handlerGuards = (name: string): unknown[] =>
      Reflect.getMetadata(GUARDS_METADATA, proto[name]) ?? [];

    it('discovers exactly the five writes B9-B13', () => {
      expect(writeHandlerNames).toEqual([
        'createUnit',
        'updateUnit',
        'inactivateUnit',
        'reactivateUnit',
        'deleteUnit',
      ]);
    });

    it.each(writeHandlerNames)(
      '%s declares HumanCredentialGuard',
      (handlerName) => {
        expect(handlerGuards(handlerName)).toContain(HumanCredentialGuard);
      },
    );

    it.each(readHandlerNames)(
      '%s (read) does not declare it, so consumer integrations keep C1-C3',
      (handlerName) => {
        expect(handlerGuards(handlerName)).not.toContain(HumanCredentialGuard);
      },
    );

    // Validation advisory T13-a (2026-11-10): the 403 is documented in Swagger.
    it.each(writeHandlerNames)(
      '%s documents the 403 for a machine credential or a missing role',
      (handlerName) => {
        const responses = Reflect.getMetadata(
          DECORATORS.API_RESPONSE,
          proto[handlerName],
        );
        expect(responses?.['403']?.description).toBe(
          'The caller lacks CENTER_ADMIN / SYSTEM_ADMIN, or authenticated with a machine (app-secret) credential: writes need a signed-in user',
        );
      },
    );

    it('is not declared at class level (that would close the reads too)', () => {
      expect(
        Reflect.getMetadata(GUARDS_METADATA, OrganizationalStructureController),
      ).not.toContain(HumanCredentialGuard);
    });
  });

  describe('validation pipes (R-ORG-001, 002, 016, 017)', () => {
    // Read from the handler metadata, NOT rebuilt in the test: a handler that
    // loses `forbidNonWhitelisted` would let `portfolioId`, `id` or a director
    // name through, and only this reads the pipe the route really runs.
    it.each([
      'getYearView',
      'searchStaff',
      'getChangeLog',
      'resolve',
      'getAncestors',
      'createUnit',
      'updateUnit',
      'inactivateUnit',
      'reactivateUnit',
      'deleteUnit',
    ])(
      '%s runs a ValidationPipe with whitelist, forbidNonWhitelisted and transform',
      (handlerName) => {
        const pipes: Array<{
          validatorOptions?: Record<string, unknown>;
          isTransformEnabled?: boolean;
        }> = Reflect.getMetadata('__pipes__', proto[handlerName]) ?? [];
        expect(pipes).toHaveLength(1);
        expect(pipes[0].validatorOptions).toMatchObject({
          whitelist: true,
          forbidNonWhitelisted: true,
        });
        expect(pipes[0].isTransformEnabled).toBe(true);
      },
    );
  });

  describe('route inventory', () => {
    const routes = handlerNames.map((name) => ({
      name,
      method: Reflect.getMetadata(
        METHOD_METADATA,
        proto[name],
      ) as RequestMethod,
      path: Reflect.getMetadata(PATH_METADATA, proto[name]) as string,
    }));

    it('exposes exactly B1-B13 and C1-C3 on the design paths (no PUT; DELETE only on `units/:id`)', () => {
      expect(routes.map((r) => [r.method, r.path])).toEqual([
        [RequestMethod.GET, 'units'],
        [RequestMethod.GET, 'units/code-proposal'],
        [RequestMethod.GET, 'staff'],
        [RequestMethod.GET, 'years'],
        [RequestMethod.GET, 'change-log'],
        [RequestMethod.GET, 'resolve'],
        [RequestMethod.GET, 'units/:id'],
        [RequestMethod.GET, 'units/:id/history'],
        [RequestMethod.GET, 'units/:id/linked-data'],
        [RequestMethod.GET, 'units/:id/ancestors'],
        [RequestMethod.GET, 'units/:id/successors'],
        [RequestMethod.POST, 'units'],
        [RequestMethod.PATCH, 'units/:id'],
        [RequestMethod.POST, 'units/:id/inactivate'],
        [RequestMethod.POST, 'units/:id/reactivate'],
        [RequestMethod.DELETE, 'units/:id'],
      ]);
      expect(routes.some((r) => r.method === RequestMethod.PUT)).toBe(false);
    });

    // NFR-ORG-003, R-ORG-009 AC.2: the log is append-only, so the only way to
    // reach it over HTTP is a read. Discovered from the metadata, not typed.
    it('has NO PATCH, PUT or DELETE (and no POST) under `change-log`: its only route is a GET', () => {
      const underLog = routes.filter((r) => r.path.startsWith('change-log'));
      expect(underLog.length).toBeGreaterThan(0);
      for (const route of underLog) {
        expect(route.method).toBe(RequestMethod.GET);
      }
      expect(
        routes.filter(
          (r) =>
            r.path.includes('change-log') && r.method !== RequestMethod.GET,
        ),
      ).toEqual([]);
    });

    it('declares the literal `change-log` route before every `units/:id` route', () => {
      const logIndex = routes.findIndex((r) => r.path === 'change-log');
      const firstId = routes.findIndex((r) => r.path.startsWith('units/:id'));
      expect(logIndex).toBeGreaterThan(-1);
      expect(logIndex).toBeLessThan(firstId);
    });

    it('declares the literal GET routes before the GET `:id` route (B3 would otherwise be read as an id)', () => {
      const idIndex = routes.findIndex(
        (r) => r.method === RequestMethod.GET && r.path.includes(':'),
      );
      expect(idIndex).toBeGreaterThan(-1);
      routes
        .filter((r) => r.method === RequestMethod.GET && !r.path.includes(':'))
        .forEach((literal) =>
          expect(routes.indexOf(literal)).toBeLessThan(idIndex),
        );
    });

    it('declares no portfolio parameter on any handler (R-ORG-001 AC.1)', () => {
      for (const handlerName of handlerNames) {
        const params: Array<{ name?: string }> =
          Reflect.getMetadata(DECORATORS.API_PARAMETERS, proto[handlerName]) ??
          [];
        expect(params.map((p) => (p.name ?? '').toLowerCase())).not.toContain(
          'portfolioid',
        );
      }
    });
  });

  describe('Swagger (NFR-ORG-006)', () => {
    it('tags the controller and documents every handler', () => {
      expect(
        Reflect.getMetadata(
          DECORATORS.API_TAGS,
          OrganizationalStructureController,
        ),
      ).toEqual(['Organizational Structure']);
      for (const handlerName of handlerNames) {
        const operation: { summary: string } = Reflect.getMetadata(
          DECORATORS.API_OPERATION,
          proto[handlerName],
        );
        expect(operation?.summary).toBeTruthy();
      }
    });

    it('documents the year and includeEnded query of B1 and the id param of B5', () => {
      const b1: Array<{ name: string; required: boolean }> =
        Reflect.getMetadata(DECORATORS.API_PARAMETERS, proto.getYearView);
      expect(b1.map((p) => p.name).sort()).toEqual(['includeEnded', 'year']);
      expect(b1.every((p) => p.required === false)).toBe(true);
      const b5: Array<{ name: string }> = Reflect.getMetadata(
        DECORATORS.API_PARAMETERS,
        proto.getUnit,
      );
      expect(b5.map((p) => p.name)).toEqual(['id']);
    });
  });

  describe('Swagger for the T-02 handlers (NFR-ORG-006)', () => {
    it('B4 documents the required search query', () => {
      const params: Array<{ name: string; required: boolean }> =
        Reflect.getMetadata(DECORATORS.API_PARAMETERS, proto.searchStaff);
      expect(params).toEqual([
        expect.objectContaining({ name: 'search', required: true }),
      ]);
    });

    it('B9 (201) and B10 (200) document `data.outcome` through the OrgSaveOutcomeDto schema', () => {
      for (const [handler, status] of [
        ['createUnit', '201'],
        ['updateUnit', '200'],
      ]) {
        const responses = Reflect.getMetadata(
          DECORATORS.API_RESPONSE,
          proto[handler],
        );
        expect(
          JSON.stringify(
            responses[status].schema.properties.data.properties.outcome,
          ),
        ).toContain('OrgSaveOutcomeDto');
      }
    });

    it('B9 and B10 document a body; B10 also the id param', () => {
      const b9: Array<{ in: string }> = Reflect.getMetadata(
        DECORATORS.API_PARAMETERS,
        proto.createUnit,
      );
      expect(b9.map((p) => p.in)).toEqual(['body']);
      const b10: Array<{ in: string; name: string }> = Reflect.getMetadata(
        DECORATORS.API_PARAMETERS,
        proto.updateUnit,
      );
      expect(b10.map((p) => p.in).sort()).toEqual(['body', 'path']);
    });
  });

  describe('Swagger for the T-03 handlers (NFR-ORG-006)', () => {
    const paramsOf = (handler: string) =>
      (Reflect.getMetadata(DECORATORS.API_PARAMETERS, proto[handler]) ??
        []) as Array<{ name?: string; in: string; required?: boolean }>;

    it('B6 documents the id path param; B7 documents the REQUIRED unitId query', () => {
      expect(paramsOf('getUnitHistory').map((p) => [p.in, p.name])).toEqual([
        ['path', 'id'],
      ]);
      expect(paramsOf('getChangeLog')).toEqual([
        expect.objectContaining({
          in: 'query',
          name: 'unitId',
          required: true,
        }),
      ]);
    });

    it('B11 and B12 document the id param and a body; B13 documents id, fromYear and backdate', () => {
      for (const handler of ['inactivateUnit', 'reactivateUnit']) {
        expect(
          paramsOf(handler)
            .map((p) => p.in)
            .sort(),
        ).toEqual(['body', 'path']);
      }
      expect(
        paramsOf('deleteUnit')
          .map((p) => `${p.in}:${p.name}`)
          .sort(),
      ).toEqual(['path:id', 'query:backdate', 'query:fromYear']);
    });

    it('B11 and B12 answer 200 (not the POST default 201)', () => {
      for (const handler of ['inactivateUnit', 'reactivateUnit']) {
        expect(Reflect.getMetadata('__httpCode__', proto[handler])).toBe(200);
      }
    });
  });

  describe('Swagger for the T-04 handlers (NFR-ORG-006)', () => {
    const paramsOf = (handler: string) =>
      (Reflect.getMetadata(DECORATORS.API_PARAMETERS, proto[handler]) ??
        []) as Array<{ name: string; in: string; required?: boolean }>;

    it('C1 documents a REQUIRED ids query and an optional year; C2 an id param and an optional year; C3 an id param; B8 an id param', () => {
      expect(
        [...paramsOf('resolve')].sort((a, b) => a.name.localeCompare(b.name)),
      ).toEqual([
        expect.objectContaining({ in: 'query', name: 'ids', required: true }),
        expect.objectContaining({ in: 'query', name: 'year', required: false }),
      ]);
      expect(
        paramsOf('getAncestors')
          .map((p) => `${p.in}:${p.name}`)
          .sort(),
      ).toEqual(['path:id', 'query:year']);
      expect(paramsOf('getSuccessors').map((p) => `${p.in}:${p.name}`)).toEqual(
        ['path:id'],
      );
      expect(paramsOf('getLinkedData').map((p) => `${p.in}:${p.name}`)).toEqual(
        ['path:id'],
      );
    });

    it('C1 documents the row shapes in its 200 response: null-version cases and `missing` rows', () => {
      const responses = Reflect.getMetadata(
        DECORATORS.API_RESPONSE,
        proto.resolve,
      );
      const text: string = responses['200'].description;
      expect(text).toContain('{ id, missing: true }');
      expect(text).toContain('before its first version');
      expect(text).toContain('reactivation gap');
    });

    it('B8 documents the shape of `data` in its 200 response', () => {
      const responses = Reflect.getMetadata(
        DECORATORS.API_RESPONSE,
        proto.getLinkedData,
      );
      expect(responses['200'].description).toContain('childCount');
      expect(responses['200'].description).toContain('consumers');
    });
  });

  describe('envelope per handler', () => {
    it('B1 wraps the year view with status 200', async () => {
      readService.getYearView.mockResolvedValue([{ id: 1 }]);

      const result = await controller.getYearView({
        year: 2027,
        includeEnded: true,
      });

      expect(readService.getYearView).toHaveBeenCalledWith(2027, true);
      expect(result).toEqual({
        description: 'Year view found',
        status: HttpStatus.OK,
        data: [{ id: 1 }],
        errors: undefined,
      });
    });

    it('B2 wraps the year range with status 200', async () => {
      const range = { min: 2026, max: 2026, current: 2026 };
      readService.getYearRange.mockResolvedValue(range);

      const result = await controller.getYears();

      expect(result).toMatchObject({ status: HttpStatus.OK, data: range });
    });

    it('B5 wraps the entry with status 200 and passes the numeric id', async () => {
      readService.getUnitDetail.mockResolvedValue({ id: 5 });

      const result = await controller.getUnit(5);

      expect(readService.getUnitDetail).toHaveBeenCalledWith(5);
      expect(result).toMatchObject({
        status: HttpStatus.OK,
        data: { id: 5 },
      });
    });
  });

  describe('envelope of the T-02 handlers', () => {
    it('B3 wraps the proposal with status 200', async () => {
      service.proposeCode.mockResolvedValue({ code: 'ORG-118' });
      expect(await controller.getCodeProposal()).toMatchObject({
        status: HttpStatus.OK,
        data: { code: 'ORG-118' },
      });
    });

    it('B4 passes the search term and wraps the rows with status 200', async () => {
      service.searchStaff.mockResolvedValue([{ carnet: 'A1' }]);
      const result = await controller.searchStaff({ search: 'pe' });
      expect(service.searchStaff).toHaveBeenCalledWith('pe');
      expect(result).toMatchObject({
        status: HttpStatus.OK,
        data: [{ carnet: 'A1' }],
      });
    });

    it('B9 wraps the created entry with status 201', async () => {
      service.create.mockResolvedValue({ id: 9 });
      const body = { levelId: 20, name: 'N', appliesFromYear: 2026 };
      const result = await controller.createUnit(body);
      expect(service.create).toHaveBeenCalledWith(body);
      expect(result).toMatchObject({
        status: HttpStatus.CREATED,
        data: { id: 9 },
      });
    });

    it('B10 passes the numeric id and wraps the entry with status 200', async () => {
      service.update.mockResolvedValue({ id: 9 });
      const result = await controller.updateUnit(9, { name: 'N2' });
      expect(service.update).toHaveBeenCalledWith(9, { name: 'N2' });
      expect(result).toMatchObject({
        status: HttpStatus.OK,
        data: { id: 9 },
      });
    });
  });

  describe('envelope of the T-03 handlers', () => {
    it('B6 passes the numeric id and wraps the history with status 200', async () => {
      readService.getUnitHistory.mockResolvedValue({ versions: [], log: [] });
      const result = await controller.getUnitHistory(7);
      expect(readService.getUnitHistory).toHaveBeenCalledWith(7);
      expect(result).toMatchObject({
        status: HttpStatus.OK,
        data: { versions: [], log: [] },
      });
    });

    it('B7 passes unitId and wraps the rows with status 200', async () => {
      readService.getChangeLog.mockResolvedValue([{ id: 1 }]);
      const result = await controller.getChangeLog({ unitId: 118 });
      expect(readService.getChangeLog).toHaveBeenCalledWith(118);
      expect(result).toMatchObject({
        status: HttpStatus.OK,
        data: [{ id: 1 }],
      });
    });

    it('B11 and B12 pass id and body and wrap the entry with status 200', async () => {
      service.inactivate.mockResolvedValue({ id: 61 });
      service.reactivate.mockResolvedValue({ id: 61 });
      const inactivateBody = { fromYear: 2027, successorId: 60 };
      const reactivateBody = { fromYear: 2028 };
      expect(await controller.inactivateUnit(61, inactivateBody)).toMatchObject(
        { status: HttpStatus.OK, data: { id: 61 } },
      );
      expect(service.inactivate).toHaveBeenCalledWith(61, inactivateBody);
      expect(await controller.reactivateUnit(61, reactivateBody)).toMatchObject(
        { status: HttpStatus.OK, data: { id: 61 } },
      );
      expect(service.reactivate).toHaveBeenCalledWith(61, reactivateBody);
    });

    it('B13 passes id and query and wraps `{ id, mode }` with status 200', async () => {
      service.remove.mockResolvedValue({
        id: 90,
        mode: 'logical',
        fromYear: 2027,
      });
      const query = { fromYear: 2027 };
      const result = await controller.deleteUnit(90, query);
      expect(service.remove).toHaveBeenCalledWith(90, query);
      expect(result).toMatchObject({
        status: HttpStatus.OK,
        data: { id: 90, mode: 'logical', fromYear: 2027 },
      });
    });
  });
  describe('envelope of the T-04 handlers', () => {
    it('C1 passes ids and year and wraps the rows with status 200', async () => {
      readService.resolve.mockResolvedValue([{ id: 57, version: null }]);
      const result = await controller.resolve({ ids: [57], year: 2030 });
      expect(readService.resolve).toHaveBeenCalledWith([57], 2030);
      expect(result).toMatchObject({
        status: HttpStatus.OK,
        data: [{ id: 57, version: null }],
      });
    });

    it('C2 and C3 pass the numeric id (and year) and wrap the chain with status 200', async () => {
      readService.ancestors.mockResolvedValue([{ id: 57 }]);
      readService.successors.mockResolvedValue([{ id: 58 }]);
      expect(await controller.getAncestors(57, { year: 2028 })).toMatchObject({
        status: HttpStatus.OK,
        data: [{ id: 57 }],
      });
      expect(readService.ancestors).toHaveBeenCalledWith(57, 2028);
      expect(await controller.getSuccessors(57)).toMatchObject({
        status: HttpStatus.OK,
        data: [{ id: 58 }],
      });
      expect(readService.successors).toHaveBeenCalledWith(57);
    });

    it('B8 passes the numeric id and wraps the linked data with status 200', async () => {
      readService.getLinkedData.mockResolvedValue({
        childCount: 2,
        consumers: [{ consumer: 'Test consumer', count: 3 }],
      });
      const result = await controller.getLinkedData(57);
      expect(readService.getLinkedData).toHaveBeenCalledWith(57);
      expect(result).toMatchObject({
        status: HttpStatus.OK,
        data: {
          childCount: 2,
          consumers: [{ consumer: 'Test consumer', count: 3 }],
        },
      });
    });
  });
});
