// @akili-spec changes/agresso-staff-sec-users-sync (T-08 — SYSTEM_ADMIN trigger guard, R-AGS-006)
import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext, HttpStatus } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AgressoStaffToolsController } from './agresso-staff-tools.controller';
import { AgressoStaffToolsService } from './agresso-staff-tools.service';
import { ResponseUtils } from '../../../shared/utils/response.utils';
import { RolesGuard, ROLES_KEY } from '../../../shared/guards/roles.guard';
import { SecRolesEnum } from '../../../shared/enum/sec_role.enum';

jest.mock('../../../shared/utils/response.utils');

describe('AgressoStaffToolsController', () => {
  let controller: AgressoStaffToolsController;
  const mockService = { cloneAllAgressoStaff: jest.fn() };
  const mockFormat = jest.fn();

  beforeEach(async () => {
    jest.clearAllMocks();
    (ResponseUtils.format as jest.Mock) = mockFormat;
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AgressoStaffToolsController],
      providers: [{ provide: AgressoStaffToolsService, useValue: mockService }],
    }).compile();
    controller = module.get(AgressoStaffToolsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('runCloneClarisa', () => {
    mockFormat.mockReturnValue({});
    controller.runCloneClarisa();
    expect(mockService.cloneAllAgressoStaff).toHaveBeenCalled();
    expect(ResponseUtils.format).toHaveBeenCalledWith({
      description: 'The clone process has been started',
      status: HttpStatus.OK,
    });
  });

  describe('R-AGS-006 — only a system admin can trigger the sync', () => {
    const handler = AgressoStaffToolsController.prototype.runCloneClarisa;

    it('declares @Roles(SYSTEM_ADMIN) and RolesGuard on the HANDLER, not inside the service (DD-10)', () => {
      // DD-10: the handler does not `await` the service, so a check placed inside it would let the
      // whole reconciliation begin and still return a refusal. The guard must refuse BEFORE the
      // handler body runs, which means it has to be metadata on the route.
      expect(Reflect.getMetadata(ROLES_KEY, handler)).toEqual([
        SecRolesEnum.SYSTEM_ADMIN,
      ]);
      expect(Reflect.getMetadata('__guards__', handler)).toContain(RolesGuard);
    });

    /** A minimal ExecutionContext pointing at the real handler, so the real metadata is read. */
    function contextFor(user: unknown): ExecutionContext {
      return {
        getHandler: () => handler,
        getClass: () => AgressoStaffToolsController,
        switchToHttp: () => ({ getRequest: () => ({ user }) }),
      } as unknown as ExecutionContext;
    }

    it('refuses a CONTRIBUTOR caller — and the refusal happens before any reconciliation (AC.2)', () => {
      const guard = new RolesGuard(new Reflector());

      const allowed = guard.canActivate(
        contextFor({ sec_user_id: 5, roles: [SecRolesEnum.CONTRIBUTOR] }),
      );

      expect(allowed).toBe(false);
      // The guard returning false is what stops the work: Nest never invokes the handler, so the
      // fire-and-forget service call below is never reached.
      expect(mockService.cloneAllAgressoStaff).not.toHaveBeenCalled();
    });

    it('admits a SYSTEM_ADMIN caller (AC.1)', () => {
      const guard = new RolesGuard(new Reflector());

      expect(
        guard.canActivate(
          contextFor({ sec_user_id: 1, roles: [SecRolesEnum.SYSTEM_ADMIN] }),
        ),
      ).toBe(true);
    });

    it('refuses a null req.user — closing RSK-6 on THIS route only, as a side effect', () => {
      // RolesGuard denies a null user only on @Roles-decorated routes. Before T-08 this route had
      // no @Roles, so a machine token whose responsible user is inactive reached the handler with
      // req.user = null. This is a side benefit on one endpoint, NOT a fix: RSK-6 stays live
      // everywhere else (design.md §8).
      const guard = new RolesGuard(new Reflector());

      expect(guard.canActivate(contextFor(null))).toBe(false);
    });

    it('keeps its Swagger surface — @ApiTags, @ApiBearerAuth and @ApiOperation', () => {
      expect(
        Reflect.getMetadata('swagger/apiUseTags', AgressoStaffToolsController),
      ).toEqual(['Agresso Connection']);
      expect(
        Reflect.getMetadata('swagger/apiSecurity', AgressoStaffToolsController),
      ).toEqual([{ bearer: [] }]);
      // @ApiOperation was ABSENT before T-08, in breach of root CLAUDE.md §4.1 ("every new endpoint
      // MUST declare @ApiTags, @ApiBearerAuth, @ApiOperation"). Added here because this task is
      // what makes the route's authorization contract worth documenting.
      expect(Reflect.getMetadata('swagger/apiOperation', handler)).toEqual(
        expect.objectContaining({
          summary: expect.stringContaining('SYSTEM_ADMIN'),
        }),
      );
    });
  });
});
