import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { signal } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideLocationMocks } from '@angular/common/testing';
import { routes } from './app.routes';
import { CacheService } from '@services/cache/cache.service';

/**
 * The guarded platform route has an empty path, so its `canMatch` runs for every url the
 * earlier routes did not take. These exercise the REAL route table — the unit tests in
 * roles.guard.spec.ts call the guard with a hand-built `Route`, so they cannot see which
 * urls the router actually hands it.
 */
describe('app.routes — unauthenticated deep links', () => {
  const navigate = async (path: string, isLoggedIn: boolean) => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        provideRouter(routes),
        provideHttpClient(),
        provideHttpClientTesting(),
        provideLocationMocks(),
        {
          provide: CacheService,
          useValue: { isLoggedIn: signal(isLoggedIn), isValidatingToken: signal(false), dataCache: signal({}) }
        }
      ]
    });
    const router = TestBed.inject(Router);
    await router.navigateByUrl(path).catch(() => undefined);
    return router.url;
  };

  it('serves the public /reporting page to a logged-out visitor', async () => {
    await expect(navigate('/reporting', false)).resolves.toBe('/reporting');
  });

  it('serves the public /reporting page to a logged-in visitor', async () => {
    await expect(navigate('/reporting', true)).resolves.toBe('/reporting');
  });

  it('does not send a logged-out visitor of an unknown url to /login', async () => {
    // The reported defect: any url the router could not match was answered with the login
    // screen, so a public page one build behind — or a plain typo — read as "you must log in".
    const url = await navigate('/reporting-typo', false);

    expect(url).not.toContain('/login');
  });

  it('still deep-links a logged-out visitor of a PROTECTED page to /login with a returnUrl', async () => {
    await expect(navigate('/results-center', false)).resolves.toBe('/login?returnUrl=%2Fresults-center');
    await expect(navigate('/home', false)).resolves.toBe('/login?returnUrl=%2Fhome');
  });

  it('leaves the app root on the landing page rather than /login', async () => {
    await expect(navigate('/', false)).resolves.toBe('/');
  });

  it('keeps protected pages reachable when logged in', async () => {
    await expect(navigate('/results-center', true)).resolves.toBe('/results-center');
  });

  it('H59: opens /project-detail/:id/project-results instead of a blank page', async () => {
    await expect(navigate('/project-detail/A1080/project-results', true)).resolves.toBe('/project-detail/A1080/project-results');
  });

  it('H59: sends a logged-in visitor of an unknown url to home instead of a blank page', async () => {
    await expect(navigate('/this-page-does-not-exist', true)).resolves.toBe('/home');
  });
});

describe('app.routes — browser tab titles', () => {
  it('names every result section in the browser tab', () => {
    const platform = routes.find(r => r.path === '' && r.data?.['isLoggedIn'] === true);
    const result = platform?.children?.find(r => r.path === 'result/:id');
    const sections = (result?.children ?? []).filter(r => r.loadComponent);
    expect(sections.length).toBeGreaterThan(0);
    sections.forEach(section => expect(section.data?.['pageTitle']).toEqual(expect.any(String)));
  });
});
