import 'reflect-metadata';
import { MiddlewareConsumer, RequestMethod } from '@nestjs/common';
import { Routes } from '@nestjs/core';
import { AppModule } from './app.module';
import { route } from './domain/routes/main.routes';
import { JwtMiddleware } from './domain/shared/middlewares/jwr.middleware';
import { AgrovocModule } from './domain/tools/agrovoc/agrovoc.module';

/**
 * T-07 attempt 2 (R-IUA-002 AC.7, `design.md` DD-16).
 *
 * AC.7's `401` on an unauthenticated request is produced by `JwtMiddleware`
 * applying to the route. The exclude list built inside `AppModule#configure()`
 * is the actual mechanism that would suppress it, so an assertion over that
 * list's content is sound — not a proxy standing in for the real thing
 * (DD-16). It does **not** prove a live `401` over HTTP: that needs an
 * authenticated e2e seam this repo's unit tier does not have
 * (`design.md` §10.1 — "Cannot prove ... Nothing about HTTP, auth, or
 * Swagger"). That residual is stated here, not hidden.
 *
 * `configure()` is exercised directly — not mocked away — against a fake
 * `MiddlewareConsumer` that records the real `.exclude(...)` call
 * arguments. A future change that widened the exclude list to cover the
 * Innovation Use route would be caught by this assertion; today's list
 * (`configuration/:key`, `/`, `/admin(.*)`, `/admin/public(.*)`,
 * `/.well-known(.*)`, `/favicon.ico`, `reports/:resultCode/pdf`,
 * `prms-callback(.*)`) contains
 * no such entry.
 */
describe('AppModule — JwtMiddleware exclude list (R-IUA-002 AC.7, DD-16)', () => {
  it('does not exclude the Innovation Use section route from JwtMiddleware', () => {
    let capturedExcludes: Array<{ path: string; method: RequestMethod }> = [];
    const excludeMock = jest.fn(
      (...routes: Array<{ path: string; method: RequestMethod }>) => {
        capturedExcludes = routes;
        return { forRoutes: jest.fn() };
      },
    );
    const applyMock = jest.fn().mockReturnValue({ exclude: excludeMock });
    const mockConsumer = {
      apply: applyMock,
    } as unknown as MiddlewareConsumer;

    new AppModule().configure(mockConsumer);

    expect(applyMock).toHaveBeenCalledWith(JwtMiddleware);
    expect(excludeMock).toHaveBeenCalled();
    expect(capturedExcludes.length).toBeGreaterThan(0);
    expect(
      capturedExcludes.some((route) => route.path.includes('innovation-use')),
    ).toBe(false);
  });
});

/**
 * T-02 (R-AGV-002 AC.1 registration, AC.3). Membership in `AppModule.imports`
 * is what instantiates the module; the exported route tree only stamps
 * `MODULE_PATH`. Both are required (KZ-017). The exclude-list assertion
 * reuses the same captured `.exclude(...)` arguments as the block above.
 * It does not prove a live HTTP 401 — that seam is T-05.
 */
describe('AppModule — AGROVOC registration (T-02)', () => {
  it('lists AgrovocModule in AppModule imports metadata', () => {
    const imports: unknown[] = Reflect.getMetadata('imports', AppModule);

    expect(imports).toContain(AgrovocModule);
  });

  it('resolves tools → agrovoc → AgrovocModule in the exported route tree', () => {
    const toolsNode = (route as Routes).find(
      (node) => (node as { path?: string }).path === 'tools',
    ) as { children?: Routes } | undefined;

    expect(toolsNode).toBeDefined();
    expect(toolsNode.children).toBeDefined();

    const agrovocNode = toolsNode.children.find(
      (node) => (node as { path?: string }).path === 'agrovoc',
    ) as { module?: unknown } | undefined;

    expect(agrovocNode).toBeDefined();
    expect(agrovocNode.module).toBe(AgrovocModule);
  });

  it('does not exclude tools/agrovoc from JwtMiddleware (R-AGV-002 AC.3)', () => {
    let capturedExcludes: Array<{ path: string; method: RequestMethod }> = [];
    const excludeMock = jest.fn(
      (...routes: Array<{ path: string; method: RequestMethod }>) => {
        capturedExcludes = routes;
        return { forRoutes: jest.fn() };
      },
    );
    const applyMock = jest.fn().mockReturnValue({ exclude: excludeMock });
    const mockConsumer = {
      apply: applyMock,
    } as unknown as MiddlewareConsumer;

    new AppModule().configure(mockConsumer);

    expect(applyMock).toHaveBeenCalledWith(JwtMiddleware);
    expect(
      capturedExcludes.some((entry) => entry.path.includes('tools/agrovoc')),
    ).toBe(false);
  });
});
