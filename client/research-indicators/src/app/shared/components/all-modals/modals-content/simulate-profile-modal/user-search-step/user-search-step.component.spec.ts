// @akili-spec changes/profile-simulation — T-09, R-IMP-007 (AC.1, AC.2), NFR-IMP-005
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { HttpErrorResponse } from '@angular/common/http';
import { Tooltip } from 'primeng/tooltip';
import { UserSearchStepComponent } from './user-search-step.component';
import { ApiService } from '@shared/services/api.service';
import { ImpersonationUserRow } from '@interfaces/impersonation.interface';
import { MainResponse } from '@shared/interfaces/responses.interface';

function row(overrides: Partial<ImpersonationUserRow> = {}): ImpersonationUserRow {
  return {
    sec_user_id: 1042,
    first_name: 'Mariana',
    last_name: 'Rojas',
    email: 'm.rojas@cgiar.org',
    is_active: true,
    roles: [{ role_id: 1, name: 'Contributor' }],
    simulable: true,
    ...overrides
  };
}

function blockedRow(overrides: Partial<ImpersonationUserRow> = {}): ImpersonationUserRow {
  return row({
    sec_user_id: 15,
    first_name: 'Luis',
    last_name: 'Rojas',
    email: 'l.rojas@cgiar.org',
    roles: [{ role_id: 2, name: 'System Admin' }],
    simulable: false,
    blocked_reason: 'system_admin',
    ...overrides
  });
}

function mainResponse<T>(data: T, overrides: Partial<MainResponse<T>> = {}): MainResponse<T> {
  return {
    data,
    status: 200,
    description: '',
    timestamp: '',
    path: '',
    successfulRequest: true,
    errorDetail: undefined as never,
    ...overrides
  };
}

/**
 * Finding 1 (Reviewer attempt-1 rework): rebuilds the fixture from what
 * `ToPromiseService`'s `catchError` actually returns —
 * `{ ...error, successfulRequest: false, errorDetail: error?.error }`
 * (repo pattern: `bilateral.service.ts:137` reads `res?.errorDetail?.description`).
 * `res?.description` is NEVER populated by the real pipeline on failure —
 * only `errorDetail.description` is. The old fixture
 * (`{successfulRequest:false, description:'…'}`) is a shape the pipeline
 * never emits and must not be used again.
 */
function errorMainResponse(description: string): MainResponse<ImpersonationUserRow[]> {
  const httpError = new HttpErrorResponse({ status: 500, error: { description, errors: '', detail: '' } });
  return {
    ...(httpError as unknown as Record<string, unknown>),
    data: undefined as never,
    status: 500,
    description: '',
    successfulRequest: false,
    errorDetail: { description, errors: '', detail: '' }
  } as unknown as MainResponse<ImpersonationUserRow[]>;
}

/** KZ-015: lets a test arrange the idle -> loading transition instead of jumping to the end state. */
function deferredResponse<T>() {
  let resolve!: (value: MainResponse<T>) => void;
  const promise = new Promise<MainResponse<T>>(res => {
    resolve = res;
  });
  return { promise, resolve };
}

async function waitForDebounce(): Promise<void> {
  await new Promise(resolve => setTimeout(resolve, 320));
}

describe('UserSearchStepComponent', () => {
  let fixture: ComponentFixture<UserSearchStepComponent>;
  let component: UserSearchStepComponent;
  let searchMock: jest.Mock;

  beforeEach(async () => {
    searchMock = jest.fn();

    await TestBed.configureTestingModule({
      imports: [UserSearchStepComponent],
      providers: [{ provide: ApiService, useValue: { searchImpersonationUsers: searchMock } }]
    }).compileComponents();

    fixture = TestBed.createComponent(UserSearchStepComponent);
    component = fixture.componentInstance;
  });

  it('constructs in the idle state without issuing a request', () => {
    fixture.detectChanges();

    expect(component.status()).toBe('idle');
    expect(searchMock).not.toHaveBeenCalled();
    expect(fixture.nativeElement.querySelector('[data-testid="search-loading"]')).toBeNull();
    expect(fixture.nativeElement.querySelector('[data-testid="search-results"]')).toBeNull();
  });

  it('AC.2 — typing "ro" (fewer than 3 chars) never issues a request', async () => {
    fixture.detectChanges();

    component.onInput('ro');
    await waitForDebounce();

    expect(searchMock).not.toHaveBeenCalled();
    expect(component.status()).toBe('idle');
  });

  it('AC.1 (KZ-015) — arranges idle -> loading -> results via a deferred ApiService mock, asserting each state', async () => {
    fixture.detectChanges();
    expect(component.status()).toBe('idle');

    const { promise, resolve } = deferredResponse<ImpersonationUserRow[]>();
    searchMock.mockReturnValue(promise);

    component.onInput('rojas');
    await waitForDebounce();
    fixture.detectChanges();

    // Still loading: the deferred mock has not resolved yet.
    expect(searchMock).toHaveBeenCalledWith('rojas');
    expect(component.status()).toBe('loading');
    expect(fixture.nativeElement.querySelector('[data-testid="search-loading"]')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('[data-testid="search-results"]')).toBeNull();

    resolve(mainResponse([row(), blockedRow()]));
    await fixture.whenStable();
    fixture.detectChanges();

    expect(component.status()).toBe('results');
    const resultsEl: HTMLElement = fixture.nativeElement.querySelector('[data-testid="search-results"]');
    expect(resultsEl).toBeTruthy();
    expect(resultsEl.textContent).toContain('2 matches');
    expect(fixture.nativeElement.querySelector('[data-testid="search-row-1042"]')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('[data-testid="search-row-15"]')).toBeTruthy();
  });

  it('shows the empty state when the search returns zero rows', async () => {
    fixture.detectChanges();
    searchMock.mockResolvedValueOnce(mainResponse<ImpersonationUserRow[]>([]));

    component.onInput('zzzzz');
    await waitForDebounce();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(component.status()).toBe('empty');
    expect(fixture.nativeElement.querySelector('[data-testid="search-empty"]').textContent).toContain('No users match');
  });

  it('Finding 1 — shows the envelope errorDetail.description (not the always-undefined top-level description), and Retry re-issues the request', async () => {
    fixture.detectChanges();
    searchMock.mockResolvedValueOnce(errorMainResponse('Server unavailable'));

    component.onInput('rojas');
    await waitForDebounce();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(component.status()).toBe('error');
    const errorEl: HTMLElement = fixture.nativeElement.querySelector('[data-testid="search-error"]');
    expect(errorEl.textContent).toContain('Server unavailable');

    searchMock.mockResolvedValueOnce(mainResponse([row()]));
    const retryBtn: HTMLButtonElement = fixture.nativeElement.querySelector('[data-testid="search-retry"]');
    retryBtn.click();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(searchMock).toHaveBeenCalledTimes(2);
    expect(component.status()).toBe('results');
  });

  it('falls back to DEFAULT_SEARCH_ERROR when the envelope carries no description anywhere', async () => {
    fixture.detectChanges();
    searchMock.mockResolvedValueOnce(errorMainResponse(''));

    component.onInput('rojas');
    await waitForDebounce();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(component.status()).toBe('error');
    const errorEl: HTMLElement = fixture.nativeElement.querySelector('[data-testid="search-error"]');
    expect(errorEl.textContent).toContain('Could not load users. Try again.');
  });

  it('Finding 3 — blocked rows render disabled with an unreachable-proof tooltip wrapper and never emit on click', async () => {
    fixture.detectChanges();
    searchMock.mockResolvedValueOnce(mainResponse([row(), blockedRow()]));

    component.onInput('rojas');
    await waitForDebounce();
    await fixture.whenStable();
    fixture.detectChanges();

    const selected = jest.fn();
    component.userSelected.subscribe(selected);

    const blockedBtn: HTMLButtonElement = fixture.nativeElement.querySelector('[data-testid="search-blocked-15"]');
    expect(blockedBtn.disabled).toBe(true);
    expect(blockedBtn.textContent?.trim()).toBe('Not allowed');
    expect(blockedBtn.getAttribute('aria-disabled')).toBe('true');

    // The [pTooltip] directive must sit on a wrapper SPAN (always hoverable/
    // focusable), NOT on the native-disabled button — a disabled control
    // dispatches no mouse events and leaves the tab order, so a tooltip
    // attached directly to it can never be reached by a real user.
    const tooltipDebugEl = fixture.debugElement.query(By.directive(Tooltip));
    expect(tooltipDebugEl).toBeTruthy();
    expect(tooltipDebugEl.nativeElement.tagName).toBe('SPAN');
    expect(tooltipDebugEl.nativeElement.contains(blockedBtn)).toBe(true);
    // `Tooltip` is a directive, not a component — its instance comes from
    // the element injector, not `.componentInstance` (that resolves to the
    // nearest hosted COMPONENT, i.e. this test's own fixture component).
    const tooltipDirective = tooltipDebugEl.injector.get(Tooltip);
    expect(tooltipDirective.content).toBe(component.blockedReason(blockedRow()));

    blockedBtn.click();
    expect(selected).not.toHaveBeenCalled();

    // Unit-level guard, independent of template wiring (R-IMP-007 scenario "Select").
    component.select(blockedRow());
    expect(selected).not.toHaveBeenCalled();
  });

  describe('Finding 3 — blockedReason() unit table (replaces the DOM tautology)', () => {
    it('maps every blocked_reason to its label, and undefined to the default', () => {
      expect(component.blockedReason(blockedRow({ blocked_reason: 'system_admin' }))).toBe('Other System Admins cannot be simulated.');
      expect(component.blockedReason(blockedRow({ blocked_reason: 'inactive' }))).toBe('Inactive accounts cannot be simulated.');
      expect(component.blockedReason(blockedRow({ blocked_reason: 'self' }))).toBe('You cannot simulate yourself.');
      expect(component.blockedReason(blockedRow({ blocked_reason: undefined }))).toBe('This account cannot be simulated.');
    });
  });

  it('emits the chosen row when Select is clicked on a simulable row', async () => {
    fixture.detectChanges();
    searchMock.mockResolvedValueOnce(mainResponse([row()]));

    component.onInput('rojas');
    await waitForDebounce();
    await fixture.whenStable();
    fixture.detectChanges();

    const selected = jest.fn();
    component.userSelected.subscribe(selected);

    const selectBtn: HTMLButtonElement = fixture.nativeElement.querySelector('[data-testid="search-select-1042"]');
    selectBtn.click();

    expect(selected).toHaveBeenCalledWith(row());
  });

  it('caps the results count label at "20+ matches" for exactly 20 rows', async () => {
    fixture.detectChanges();
    const twenty = Array.from({ length: 20 }, (_, i) => row({ sec_user_id: i + 1, email: `u${i + 1}@cgiar.org` }));
    searchMock.mockResolvedValueOnce(mainResponse(twenty));

    component.onInput('rojas');
    await waitForDebounce();
    await fixture.whenStable();
    fixture.detectChanges();

    const resultsEl: HTMLElement = fixture.nativeElement.querySelector('[data-testid="search-results"]');
    expect(resultsEl.textContent).toContain('20+ matches');
    expect(resultsEl.textContent).not.toContain('20 matches');
  });

  it('advisory: stale-response guard — an older slow response never overwrites a newer one (double-click Retry)', async () => {
    fixture.detectChanges();
    const older = deferredResponse<ImpersonationUserRow[]>();
    const newer = deferredResponse<ImpersonationUserRow[]>();
    searchMock.mockReturnValueOnce(older.promise);

    component.onInput('rojas');
    await waitForDebounce();
    fixture.detectChanges();
    expect(component.status()).toBe('loading');

    // Simulate a double-click on Retry: a second, newer request goes in
    // flight before the first (older) one has resolved.
    searchMock.mockReturnValueOnce(newer.promise);
    component.retry();
    expect(searchMock).toHaveBeenCalledTimes(2);

    // Resolve the NEWER request first (as the fix should reflect), then the
    // stale OLDER one arrives late.
    newer.resolve(mainResponse([row()]));
    await fixture.whenStable();
    fixture.detectChanges();
    expect(component.status()).toBe('results');
    expect(component.results()).toEqual([row()]);

    older.resolve(errorMainResponse('stale failure that must be ignored'));
    await fixture.whenStable();
    fixture.detectChanges();

    // The stale older response must not be allowed to clobber the fresher
    // results state that the newer response already established.
    expect(component.status()).toBe('results');
    expect(component.results()).toEqual([row()]);
  });

  describe('advisory: debounce drop on backspace-below-threshold', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('type "roj", delete to "ro" within 300ms — the pending debounce fires but issues no request', () => {
      fixture.detectChanges();
      searchMock.mockReturnValue(new Promise(() => undefined));

      const input: HTMLInputElement = fixture.nativeElement.querySelector('#user-search-input');
      input.value = 'roj';
      input.dispatchEvent(new Event('input'));
      fixture.detectChanges();

      jest.advanceTimersByTime(150);

      // Backspace below the 3-char threshold before the debounce fires.
      input.value = 'ro';
      input.dispatchEvent(new Event('input'));
      fixture.detectChanges();

      jest.advanceTimersByTime(200); // crosses the original 300ms mark

      expect(searchMock).not.toHaveBeenCalled();
      expect(component.status()).toBe('idle');
    });
  });

  describe('debounce timing (fake timers, verification failing input from tasks.md T-09)', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('issues no request at 299 ms and exactly one request at 300 ms', () => {
      fixture.detectChanges();
      searchMock.mockReturnValue(new Promise(() => undefined));

      const input: HTMLInputElement = fixture.nativeElement.querySelector('#user-search-input');
      input.value = 'roj';
      input.dispatchEvent(new Event('input'));
      fixture.detectChanges();

      jest.advanceTimersByTime(299);
      expect(searchMock).not.toHaveBeenCalled();

      jest.advanceTimersByTime(1);
      expect(searchMock).toHaveBeenCalledTimes(1);
      expect(searchMock).toHaveBeenCalledWith('roj');
    });
  });
});
