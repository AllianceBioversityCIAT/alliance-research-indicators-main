/**
 * These tests deliberately drive the guard with a request produced by the **real**
 * `JwtMiddleware`, not by a hand-built context.
 *
 * That is the whole point of the task. A test that injects a synthetic
 * `authType: 'MACHINE_TOKEN'` into a mocked `ExecutionContext` goes green against a
 * guard reading a flag production never sets — the silent-no-op class, on the
 * authorization gate of an irreversible delete, with a passing test as its
 * evidence. The marker the guard reads here is the one the middleware actually
 * wrote, in the same test.
 */
import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { JwtMiddleware } from '../middlewares/jwr.middleware';
import { AlianceManagementApp } from '../../tools/broker/aliance-management.app';
import { ResultsUtil } from '../utils/results.util';
import { SecRolesEnum } from '../enum/sec_role.enum';
import {
  REQUEST_AUTH_TYPE_KEY,
  RequestAuthType,
} from '../enum/request-auth-type.enum';
import { DenyMachineTokenGuard } from './deny-machine-token.guard';

const contextFor = (request: Record<string, unknown>): ExecutionContext =>
  ({
    switchToHttp: () => ({ getRequest: () => request }),
  }) as unknown as ExecutionContext;

const machineTokenHeader = () =>
  `Bearer ${Buffer.from(
    JSON.stringify({ client_id: 'partner', client_secret: 'secret' }),
  ).toString('base64')}`;

describe('DenyMachineTokenGuard — driven through the real JwtMiddleware', () => {
  const next = jest.fn();
  const roarManagementService = { validateToken: jest.fn() };
  const appSecretsService = { validation: jest.fn() };
  let middleware: JwtMiddleware;
  let guard: DenyMachineTokenGuard;

  beforeEach(() => {
    jest.clearAllMocks();
    middleware = new JwtMiddleware(
      {} as AlianceManagementApp,
      roarManagementService as never,
      {} as ResultsUtil,
      appSecretsService as never,
    );
    guard = new DenyMachineTokenGuard();
  });

  it('denies a machine token even when its responsible user is SYSTEM_ADMIN', async () => {
    // The live exposure: all four app_secrets rows have zero host-list entries, so
    // the origin check is skipped, and one resolves to a System Admin. Roles alone
    // would let this principal through.
    appSecretsService.validation.mockResolvedValue({
      isValid: true,
      user: { sec_user_id: 32, roles: [SecRolesEnum.SYSTEM_ADMIN] },
    });
    const request: Record<string, unknown> = {
      headers: { authorization: machineTokenHeader() },
      method: 'POST',
      url: '/api/v1/results/duplicate-resolution/apply',
      socket: {},
    };

    await middleware.use(request as never, {} as never, next);

    // The middleware — not the test — set this.
    expect(request[REQUEST_AUTH_TYPE_KEY]).toBe(RequestAuthType.MACHINE_TOKEN);
    expect(() => guard.canActivate(contextFor(request))).toThrow(
      ForbiddenException,
    );
  });

  it('allows a ROAR session for the same SYSTEM_ADMIN user', async () => {
    roarManagementService.validateToken.mockResolvedValue({
      isValid: true,
      user: { sec_user_id: 32, roles: [SecRolesEnum.SYSTEM_ADMIN] },
    });
    const request: Record<string, unknown> = {
      headers: { authorization: 'Bearer a.roar.jwt' },
      method: 'GET',
      url: '/api/v1/results/duplicate-resolution/plan',
      socket: {},
    };

    await middleware.use(request as never, {} as never, next);

    expect(request[REQUEST_AUTH_TYPE_KEY]).toBe(RequestAuthType.ROAR_JWT);
    expect(guard.canActivate(contextFor(request))).toBe(true);
  });

  it('stamps a distinguishable type for each path — they are not the same value', async () => {
    // Before the marker, request.user was shape-identical for both paths, so no
    // guard could tell them apart. If these two ever compare equal, the guard is
    // decorative again.
    appSecretsService.validation.mockResolvedValue({
      isValid: true,
      user: { sec_user_id: 1, roles: [] },
    });
    roarManagementService.validateToken.mockResolvedValue({
      isValid: true,
      user: { sec_user_id: 1, roles: [] },
    });

    const machineRequest: Record<string, unknown> = {
      headers: { authorization: machineTokenHeader() },
      socket: {},
    };
    const roarRequest: Record<string, unknown> = {
      headers: { authorization: 'Bearer a.roar.jwt' },
      socket: {},
    };

    await middleware.use(machineRequest as never, {} as never, next);
    await middleware.use(roarRequest as never, {} as never, next);

    expect(machineRequest[REQUEST_AUTH_TYPE_KEY]).not.toBe(
      roarRequest[REQUEST_AUTH_TYPE_KEY],
    );
    expect(machineRequest.user).toEqual(roarRequest.user);
  });
});

describe('DenyMachineTokenGuard — failing closed', () => {
  const guard = new DenyMachineTokenGuard();

  it('denies a request with no auth-type marker at all', () => {
    // If a refactor of JwtMiddleware stops stamping the type, the endpoint must
    // break loudly rather than quietly accept every principal.
    expect(() =>
      guard.canActivate(
        contextFor({
          user: { sec_user_id: 1, roles: [SecRolesEnum.SYSTEM_ADMIN] },
        }),
      ),
    ).toThrow(ForbiddenException);
  });

  it('denies an unrecognised auth-type value', () => {
    expect(() =>
      guard.canActivate(
        contextFor({ [REQUEST_AUTH_TYPE_KEY]: 'SOMETHING_NEW' }),
      ),
    ).toThrow(ForbiddenException);
  });

  it('allows the local development bypass', () => {
    expect(
      guard.canActivate(
        contextFor({ [REQUEST_AUTH_TYPE_KEY]: RequestAuthType.LOCAL_BYPASS }),
      ),
    ).toBe(true);
  });

  it('reports a distinct message for a machine token and for a missing marker', () => {
    // An operator debugging a 403 needs to know which of the two it is.
    let machineMessage = '';
    let missingMessage = '';
    try {
      guard.canActivate(
        contextFor({ [REQUEST_AUTH_TYPE_KEY]: RequestAuthType.MACHINE_TOKEN }),
      );
    } catch (error) {
      machineMessage = (error as ForbiddenException).message;
    }
    try {
      guard.canActivate(contextFor({}));
    } catch (error) {
      missingMessage = (error as ForbiddenException).message;
    }

    expect(machineMessage).toContain('machine token');
    expect(missingMessage).toContain('could not be determined');
    expect(machineMessage).not.toBe(missingMessage);
  });
});
