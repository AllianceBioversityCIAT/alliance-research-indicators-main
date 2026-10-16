import { Test, TestingModule } from '@nestjs/testing';
import { HttpStatus } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrmsWebhookRegistrationController } from './prms-webhook-registration.controller';
import { PrmsWebhookRegistrationService } from './prms-webhook-registration.service';
import { ResponseUtils } from '../../shared/utils/response.utils';
import { RolesGuard, ROLES_KEY } from '../../shared/guards/roles.guard';
import { SecRolesEnum } from '../../shared/enum/sec_role.enum';
import { PrmsWebhookDestinationDto } from '../../tools/prms-normalizer/dto/prms-webhook.dto';

// @sdd-spec docs/specs/bilateral/prms-sync/decision-webhook — T-03 /
// R-PWH-001 AC.1, AC.2 · R-PWH-002 AC.1, AC.2, AC.4 · R-PWH-009 AC.2.
jest.mock('../../shared/utils/response.utils');

describe('PrmsWebhookRegistrationController', () => {
  let controller: PrmsWebhookRegistrationController;

  const destination: PrmsWebhookDestinationDto = {
    id: 3,
    recipient_type: 'PLATFORM',
    recipient_id: 12,
    recipient_acronym: 'STAR',
    url: 'https://star.example.org/api/prms-callback/secret',
    is_active: true,
    last_updated_date: '2026-08-25T14:22:10.000Z',
  };

  const mockService = {
    register: jest.fn(),
    read: jest.fn(),
  };
  const mockFormat = jest.fn();

  beforeEach(async () => {
    jest.clearAllMocks();
    (ResponseUtils.format as jest.Mock) = mockFormat;

    const module: TestingModule = await Test.createTestingModule({
      controllers: [PrmsWebhookRegistrationController],
      providers: [
        { provide: PrmsWebhookRegistrationService, useValue: mockService },
      ],
    })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get(PrmsWebhookRegistrationController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('role gating metadata (SYSTEM_ADMIN-only surface)', () => {
    it('declares @Roles(SYSTEM_ADMIN) at controller level, for both handlers', () => {
      const roles = Reflect.getMetadata(
        ROLES_KEY,
        PrmsWebhookRegistrationController,
      );
      expect(roles).toEqual([SecRolesEnum.SYSTEM_ADMIN]);
    });

    it('declares @UseGuards(RolesGuard) at controller level', () => {
      const guards = Reflect.getMetadata(
        '__guards__',
        PrmsWebhookRegistrationController,
      );
      expect(guards).toBeDefined();
      expect(
        (guards as ReadonlyArray<new (...args: unknown[]) => unknown>).some(
          (g) => g === RolesGuard,
        ),
      ).toBe(true);
    });
  });

  // Real RolesGuard + Reflector reading this controller's actual
  // decorators (not the overridden always-true stub above). Proxies AC.2 /
  // AC.4 at unit scope: a non-SYSTEM_ADMIN caller is DENIED (RolesGuard
  // returns false, which NestJS turns into 403). The unauthenticated-caller
  // 401 is produced upstream by the global, unmodified `JwtMiddleware` —
  // out of this task's file list (app.module.ts is T-04's) and out of unit
  // scope; it is proxied here as "no user reaches the guard at all"
  // (DENIES), and is real-request evidence only under T-04's non-stubbing
  // e2e harness (design.md DD-11, P-17).
  describe('role gating behaviour', () => {
    const reflector = new Reflector();
    const guard = new RolesGuard(reflector);

    const contextFor = (
      handler: (...args: unknown[]) => unknown,
      user?: { roles: SecRolesEnum[] },
    ) =>
      ({
        getHandler: () => handler,
        getClass: () => PrmsWebhookRegistrationController,
        switchToHttp: () => ({ getRequest: () => ({ user }) }),
      }) as never;

    it('allows SYSTEM_ADMIN on register (POST)', () => {
      const ctx = contextFor(
        PrmsWebhookRegistrationController.prototype.register,
        { roles: [SecRolesEnum.SYSTEM_ADMIN] },
      );
      expect(guard.canActivate(ctx)).toBe(true);
    });

    it('allows SYSTEM_ADMIN on read (GET)', () => {
      const ctx = contextFor(PrmsWebhookRegistrationController.prototype.read, {
        roles: [SecRolesEnum.SYSTEM_ADMIN],
      });
      expect(guard.canActivate(ctx)).toBe(true);
    });

    it('DENIES a non-SYSTEM_ADMIN role on register (proxy for 403, AC.2)', () => {
      const ctx = contextFor(
        PrmsWebhookRegistrationController.prototype.register,
        { roles: [SecRolesEnum.CONTRIBUTOR] },
      );
      expect(guard.canActivate(ctx)).toBe(false);
    });

    it('DENIES a non-SYSTEM_ADMIN role on read (proxy for 403, AC.4)', () => {
      const ctx = contextFor(PrmsWebhookRegistrationController.prototype.read, {
        roles: [SecRolesEnum.CENTER_ADMIN],
      });
      expect(guard.canActivate(ctx)).toBe(false);
    });

    it('DENIES an unauthenticated request (no user) on register', () => {
      const ctx = contextFor(
        PrmsWebhookRegistrationController.prototype.register,
        undefined,
      );
      expect(guard.canActivate(ctx)).toBe(false);
    });

    it('DENIES an unauthenticated request (no user) on read', () => {
      const ctx = contextFor(
        PrmsWebhookRegistrationController.prototype.read,
        undefined,
      );
      expect(guard.canActivate(ctx)).toBe(false);
    });
  });

  // R-PWH-009 AC.2 / K-005, structural half: the handlers accept no
  // parameters at all — no @Body(), no @Req() — so there is no code path
  // by which a caller-supplied value, including a Host header, could reach
  // the service. (The service-level half — the callback URL comes only
  // from ARI_PRMS_WEBHOOK_CALLBACK_URL — is asserted in
  // prms-webhook-registration.service.spec.ts.)
  describe('no request input reaches either handler (R-PWH-009 AC.2)', () => {
    it('register() declares zero parameters', () => {
      expect(PrmsWebhookRegistrationController.prototype.register.length).toBe(
        0,
      );
    });

    it('read() declares zero parameters', () => {
      expect(PrmsWebhookRegistrationController.prototype.read.length).toBe(0);
    });
  });

  describe('register() — POST', () => {
    it('wraps the service result in a success envelope (R-PWH-001 AC.1)', async () => {
      const result = {
        destination,
        message: 'Webhook endpoint registered successfully.',
        requestId: 'Root=1-68e94068',
      };
      mockService.register.mockResolvedValue(result);
      mockFormat.mockReturnValue({ ok: true });

      await controller.register();

      expect(mockService.register).toHaveBeenCalledWith();
      expect(ResponseUtils.format).toHaveBeenCalledWith({
        data: result,
        description: result.message,
        status: HttpStatus.OK,
      });
    });
  });

  describe('read() — GET', () => {
    it('wraps a found destination in a success envelope (R-PWH-002 AC.1)', async () => {
      const result = {
        registered: true,
        destination,
        message: 'Webhook endpoint retrieved successfully.',
      };
      mockService.read.mockResolvedValue(result);
      mockFormat.mockReturnValue({ ok: true });

      await controller.read();

      expect(ResponseUtils.format).toHaveBeenCalledWith({
        data: result,
        description: result.message,
        status: HttpStatus.OK,
      });
    });

    // R-PWH-002 AC.2, AC.3 — the DONE-criteria clause: "nothing registered"
    // is a SUCCESS envelope (status 200), never a 404, and `registered` is
    // NOT inferred from any HTTP status.
    it('wraps the nothing-registered case in a SUCCESS envelope — status 200, not 404', async () => {
      const result = {
        registered: false,
        destination: null,
        message: 'No webhook endpoint registered for this platform.',
      };
      mockService.read.mockResolvedValue(result);
      mockFormat.mockReturnValue({ ok: true });

      await controller.read();

      expect(ResponseUtils.format).toHaveBeenCalledWith({
        data: { registered: false, destination: null, message: result.message },
        description: result.message,
        status: HttpStatus.OK,
      });
      expect(ResponseUtils.format).not.toHaveBeenCalledWith(
        expect.objectContaining({ status: HttpStatus.NOT_FOUND }),
      );
    });
  });
});
