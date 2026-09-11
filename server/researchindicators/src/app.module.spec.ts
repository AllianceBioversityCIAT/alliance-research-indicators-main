import 'reflect-metadata';
import { MiddlewareConsumer, RequestMethod } from '@nestjs/common';
import { AppModule } from './app.module';
import { JwtMiddleware } from './domain/shared/middlewares/jwr.middleware';

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
 * `/.well-known(.*)`, `/favicon.ico`, `reports/:resultCode/pdf`) contains
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
