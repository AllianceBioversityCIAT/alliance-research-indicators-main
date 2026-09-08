/**
 * Gate for `isLocalAuthBypassActive`.
 *
 * This file exists because of a real failure: on 2026-08-14 the `dev` pipeline
 * broke (roar-monorepo-dev build 27) with
 *
 *   TS2339: Property 'localAuthBypass' does not exist on type '{ production: ... }'
 *
 * `src/environments/environment.ts` is gitignored, so its SHAPE is whatever the
 * checkout provides — CI builds against a file from Secrets Manager that has no
 * `localAuthBypass` key. Nothing pinned either direction of the flag, and the
 * failure was structurally unreachable from the author's machine, whose local
 * file did declare it.
 *
 * So the load-bearing case here is the SECOND one: environment WITHOUT the key.
 * It is the shape CI actually builds, and the one no local run reproduces by
 * accident.
 *
 * ⚠ WHAT THIS FILE DOES NOT COVER — verified, not assumed. Reverting the fix to
 * a declared-property read (`environment.localAuthBypass`) leaves all four tests
 * GREEN: at runtime the property is `undefined`, `undefined === true` is `false`,
 * and the behavior is identical. The regression was a COMPILE error, and this
 * suite runs under `isolatedModules` with no type-checking (Kaizen K-002), so it
 * structurally cannot see it.
 *
 * The only gate for that class is **`npm run build` against an environment file
 * that lacks the key** — which is exactly what CI does, and what caught it.
 * Do not read a green run here as "the environment-shape hazard is covered".
 */
import { isLocalAuthBypassActive } from './local-auth-bypass';

// Mutable double for the gitignored environment module, so each test can present
// a different environment SHAPE — not merely a different value.
const environmentMock: Record<string, unknown> = {};

jest.mock('@envs/environment', () => ({
  get environment() {
    return environmentMock;
  }
}));

describe('isLocalAuthBypassActive', () => {
  const setEnvironment = (shape: Record<string, unknown>) => {
    for (const key of Object.keys(environmentMock)) delete environmentMock[key];
    Object.assign(environmentMock, shape);
  };

  it('is active only when production is false AND the flag is exactly true', () => {
    setEnvironment({ production: false, localAuthBypass: true });
    expect(isLocalAuthBypassActive()).toBe(true);
  });

  it('is inactive when the environment has no localAuthBypass key at all (the CI shape)', () => {
    // The regression guard. Reading the flag as a declared property fails to
    // COMPILE against this shape; reading it structurally must yield false.
    setEnvironment({ production: false });
    expect(isLocalAuthBypassActive()).toBe(false);
  });

  it('is inactive in a production build even if the flag is left on', () => {
    setEnvironment({ production: true, localAuthBypass: true });
    expect(isLocalAuthBypassActive()).toBe(false);
  });

  it('does not accept truthy stand-ins for true', () => {
    // Guards against a future `localAuthBypass: 'true'` in someone's local file
    // silently enabling the bypass.
    for (const truthy of ['true', 1, {}, []]) {
      setEnvironment({ production: false, localAuthBypass: truthy });
      expect(isLocalAuthBypassActive()).toBe(false);
    }
  });
});
