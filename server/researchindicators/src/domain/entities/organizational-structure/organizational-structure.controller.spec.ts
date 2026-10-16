import { HttpStatus, RequestMethod } from '@nestjs/common';
import { METHOD_METADATA, PATH_METADATA } from '@nestjs/common/constants';
import { DECORATORS } from '@nestjs/swagger/dist/constants';
import { OrganizationalStructureController } from './organizational-structure.controller';
import { OrgStructureReadService } from './org-structure-read.service';
import { ROLES_KEY } from '../../shared/guards/roles.guard';
import { SecRolesEnum } from '../../shared/enum/sec_role.enum';

describe('OrganizationalStructureController (T-01: B1, B2, B5)', () => {
  const readService = {
    getYearView: jest.fn(),
    getYearRange: jest.fn(),
    getUnitDetail: jest.fn(),
  };
  const controller = new OrganizationalStructureController(
    readService as unknown as OrgStructureReadService,
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

  beforeEach(() => jest.clearAllMocks());

  describe('roles metadata (R-ORG-012, NFR-ORG-004)', () => {
    it('discovers exactly the three read handlers of T-01', () => {
      expect(handlerNames).toEqual(['getYearView', 'getYears', 'getUnit']);
    });

    it.each(handlerNames)(
      '%s declares exactly [CENTER_ADMIN, SYSTEM_ADMIN]',
      (handlerName) => {
        expect(Reflect.getMetadata(ROLES_KEY, proto[handlerName])).toEqual([
          SecRolesEnum.CENTER_ADMIN,
          SecRolesEnum.SYSTEM_ADMIN,
        ]);
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

  describe('route inventory', () => {
    const routes = handlerNames.map((name) => ({
      name,
      method: Reflect.getMetadata(
        METHOD_METADATA,
        proto[name],
      ) as RequestMethod,
      path: Reflect.getMetadata(PATH_METADATA, proto[name]) as string,
    }));

    it('exposes only GET routes, with the design paths', () => {
      expect(routes.map((r) => [r.method, r.path])).toEqual([
        [RequestMethod.GET, 'units'],
        [RequestMethod.GET, 'years'],
        [RequestMethod.GET, 'units/:id'],
      ]);
    });

    it('declares the literal routes before the `:id` route', () => {
      const idIndex = routes.findIndex((r) => r.path.includes(':'));
      expect(idIndex).toBeGreaterThan(-1);
      routes
        .filter((r) => !r.path.includes(':'))
        .forEach((literal) =>
          expect(routes.indexOf(literal)).toBeLessThan(idIndex),
        );
    });

    it('declares no portfolio parameter on any handler (R-ORG-001 AC.1)', () => {
      for (const handlerName of handlerNames) {
        const params: Array<{ name: string }> =
          Reflect.getMetadata(DECORATORS.API_PARAMETERS, proto[handlerName]) ??
          [];
        expect(params.map((p) => p.name.toLowerCase())).not.toContain(
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
});
