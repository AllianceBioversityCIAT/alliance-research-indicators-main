// @akili-spec changes/profile-simulation — T-10, R-IMP-008 (all clauses, AC.1)
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { ConfirmStepComponent } from './confirm-step.component';
import { ApiService } from '@shared/services/api.service';
import { ImpersonationService } from '@services/impersonation.service';
import { AllModalsService } from '@shared/services/cache/all-modals.service';
import { CacheService } from '@shared/services/cache/cache.service';
import { ActionsService } from '@services/actions.service';
import { WebsocketService } from '@sockets/websocket.service';
import { ImpersonationStartResponse, ImpersonationUserRow } from '@interfaces/impersonation.interface';
import { MainResponse } from '@shared/interfaces/responses.interface';

function targetRow(overrides: Partial<ImpersonationUserRow> = {}): ImpersonationUserRow {
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

const startResponseData: ImpersonationStartResponse = {
  session: { session_id: 'sess-1', started_at: '2026-08-25T10:00:00.000Z', expires_at: '2026-08-25T14:00:00.000Z' },
  user: {
    sec_user_id: 1042,
    first_name: 'Mariana',
    last_name: 'Rojas',
    email: 'm.rojas@cgiar.org',
    is_active: true,
    status_id: 1,
    user_role_list: []
  }
};

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
 * Mirrors `user-search-step.component.spec.ts`'s `errorMainResponse`
 * (Finding 1, T-09): the real `ToPromiseService` pipeline only ever
 * populates `errorDetail.description` on failure, never the top-level
 * `description` — this fixture reproduces that shape rather than one the
 * pipeline never emits.
 */
function errorMainResponse<T>(description: string): MainResponse<T> {
  const httpError = new HttpErrorResponse({ status: 500, error: { description, errors: '', detail: '' } });
  return {
    ...(httpError as unknown as Record<string, unknown>),
    data: undefined as never,
    status: 500,
    description: '',
    successfulRequest: false,
    errorDetail: { description, errors: '', detail: '' }
  } as unknown as MainResponse<T>;
}

/** KZ-015: lets a test arrange the idle -> pending transition instead of jumping to the end state. */
function deferredResponse<T>() {
  let resolve!: (value: MainResponse<T>) => void;
  const promise = new Promise<MainResponse<T>>(res => {
    resolve = res;
  });
  return { promise, resolve };
}

describe('ConfirmStepComponent', () => {
  let fixture: ComponentFixture<ConfirmStepComponent>;
  let component: ConfirmStepComponent;

  let startMock: jest.Mock;
  let impersonationStartMock: jest.Mock;
  let closeModalMock: jest.Mock;
  let configUserMock: jest.Mock;
  let navigateMock: jest.Mock;
  let showToastMock: jest.Mock;

  beforeEach(async () => {
    startMock = jest.fn();
    impersonationStartMock = jest.fn();
    closeModalMock = jest.fn();
    configUserMock = jest.fn();
    navigateMock = jest.fn().mockResolvedValue(true);
    showToastMock = jest.fn();

    await TestBed.configureTestingModule({
      imports: [ConfirmStepComponent],
      providers: [
        { provide: ApiService, useValue: { startImpersonation: startMock } },
        { provide: ImpersonationService, useValue: { start: impersonationStartMock } },
        { provide: AllModalsService, useValue: { closeModal: closeModalMock } },
        { provide: WebsocketService, useValue: { configUser: configUserMock } },
        { provide: Router, useValue: { navigate: navigateMock } },
        { provide: ActionsService, useValue: { showToast: showToastMock } },
        {
          provide: CacheService,
          useValue: { dataCache: () => ({ user: { first_name: 'Ana', last_name: 'Sandoval', sec_user_id: 1, email: 'a.sandoval@cgiar.org' } }) }
        }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(ConfirmStepComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('user', targetRow());
  });

  it('constructs in the idle state, rendering per mockup artboard 3, without issuing a request', () => {
    fixture.detectChanges();

    expect(component.pending()).toBe(false);
    expect(startMock).not.toHaveBeenCalled();

    const root: HTMLElement = fixture.nativeElement.querySelector('[data-testid="confirm-step"]');
    expect(root.textContent).toContain('Start simulation as Mariana Rojas?');
    expect(root.textContent).toContain('m.rojas@cgiar.org · ID 1042');
    expect(root.textContent).toContain('Contributor');
    // R-IMP-008: the red callout names BOTH the admin and the target.
    const callout: HTMLElement = fixture.nativeElement.querySelector('[data-testid="confirm-callout"]');
    expect(callout.textContent).toContain('Actions affect real data');
    expect(callout.textContent).toContain('Ana Sandoval');
    expect(callout.textContent).toContain('Mariana Rojas');
    expect(fixture.nativeElement.querySelector('[data-testid="confirm-error"]')).toBeNull();
  });

  it('Confirm — clicking Start simulation calls startImpersonation exactly once with {target_user_id}', () => {
    startMock.mockReturnValue(new Promise(() => undefined));
    fixture.detectChanges();

    fixture.nativeElement.querySelector('[data-testid="confirm-start"]').click();

    expect(startMock).toHaveBeenCalledTimes(1);
    expect(startMock).toHaveBeenCalledWith({ target_user_id: 1042 });
  });

  it('BUT — Cancel never calls startImpersonation; emits back instead', () => {
    fixture.detectChanges();
    const backSpy = jest.fn();
    component.back.subscribe(backSpy);

    fixture.nativeElement.querySelector('[data-testid="confirm-cancel"]').click();

    expect(startMock).not.toHaveBeenCalled();
    expect(backSpy).toHaveBeenCalledTimes(1);
  });

  // Reviewer (attempt-2): the "zero calls on Escape" acceptance clause is
  // proven where Escape is actually handled — this component owns no
  // keyboard listener of its own (see the class doc comment), so there is
  // no seam here to assert against. The real, red-provable assertion lives
  // in simulate-profile-modal.component.spec.ts's "Finding 2" test, which
  // drives a genuine `document` Escape keydown against the real, rendered
  // ConfirmStepComponent and asserts `api.startImpersonation` was never
  // called. The redundant placeholder that used to sit here (asserting only
  // that CONSTRUCTION issues no call) duplicated the first test above and
  // could never go red for the clause it was named after — removed.

  it('KZ-015 — arranges idle -> pending, asserting both buttons disabled and a spinner shown, before resolving', async () => {
    fixture.detectChanges();
    const { promise, resolve } = deferredResponse<ImpersonationStartResponse>();
    startMock.mockReturnValue(promise);

    const startBtn: HTMLButtonElement = fixture.nativeElement.querySelector('[data-testid="confirm-start"]');
    const cancelBtn: HTMLButtonElement = fixture.nativeElement.querySelector('[data-testid="confirm-cancel"]');
    startBtn.click();
    fixture.detectChanges();

    expect(component.pending()).toBe(true);
    expect(startBtn.disabled).toBe(true);
    expect(cancelBtn.disabled).toBe(true);
    expect(fixture.nativeElement.querySelector('[data-testid="confirm-start-spinner"]')).toBeTruthy();
    expect(startMock).toHaveBeenCalledTimes(1);

    resolve(mainResponse(startResponseData));
    await fixture.whenStable();
  });

  it('failing input (tasks.md T-10 verification) — a second Start-simulation click during pending still calls startImpersonation ' +
    'exactly once; the guard is `if (this.pending()) return;` at the top of start() — removing it makes this test fail (K-004 mutation ' +
    'check, performed manually and restored)', async () => {
      fixture.detectChanges();
      const { promise, resolve } = deferredResponse<ImpersonationStartResponse>();
      startMock.mockReturnValue(promise);

      // Two rapid calls, as a double-click would produce: `pending` is set
      // synchronously before the `await`, so the second call is turned away
      // before it can reach `api.startImpersonation` a second time.
      const first = component.start();
      const second = component.start();

      expect(startMock).toHaveBeenCalledTimes(1);

      resolve(mainResponse(startResponseData));
      await Promise.all([first, second]);
    });

  it('error path (R-IMP-008 AC.1) — a rejected call keeps the dialog open with the envelope description and re-enables both buttons', async () => {
    fixture.detectChanges();
    startMock.mockResolvedValueOnce(errorMainResponse<ImpersonationStartResponse>('Target account is no longer eligible'));

    fixture.nativeElement.querySelector('[data-testid="confirm-start"]').click();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(component.pending()).toBe(false);
    expect(closeModalMock).not.toHaveBeenCalled();
    expect(impersonationStartMock).not.toHaveBeenCalled();
    const errorEl: HTMLElement = fixture.nativeElement.querySelector('[data-testid="confirm-error"]');
    expect(errorEl.textContent).toContain('Target account is no longer eligible');

    const startBtn: HTMLButtonElement = fixture.nativeElement.querySelector('[data-testid="confirm-start"]');
    const cancelBtn: HTMLButtonElement = fixture.nativeElement.querySelector('[data-testid="confirm-cancel"]');
    expect(startBtn.disabled).toBe(false);
    expect(cancelBtn.disabled).toBe(false);
  });

  it('falls back to the default error message when the envelope carries no description anywhere', async () => {
    fixture.detectChanges();
    startMock.mockResolvedValueOnce(errorMainResponse<ImpersonationStartResponse>(''));

    fixture.nativeElement.querySelector('[data-testid="confirm-start"]').click();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('[data-testid="confirm-error"]').textContent).toContain(
      'Could not start the simulation. Try again.'
    );
  });

  it('success path (design §5 "Client start" step 2) — runs impersonation.start -> closeModal -> configUser -> navigate -> toast, in that order', async () => {
    const log: string[] = [];
    impersonationStartMock.mockImplementation(() => log.push('impersonation.start'));
    closeModalMock.mockImplementation(() => log.push('closeModal'));
    configUserMock.mockImplementation(() => log.push('configUser'));
    navigateMock.mockImplementation(() => {
      log.push('navigate');
      return Promise.resolve(true);
    });
    showToastMock.mockImplementation(() => log.push('toast'));
    startMock.mockResolvedValueOnce(mainResponse(startResponseData));

    fixture.detectChanges();
    await component.start();

    expect(log).toEqual(['impersonation.start', 'closeModal', 'configUser', 'navigate', 'toast']);
    expect(impersonationStartMock).toHaveBeenCalledWith(startResponseData);
    expect(closeModalMock).toHaveBeenCalledWith('simulateProfile');
    expect(configUserMock).toHaveBeenCalledWith('Mariana', 1042);
    expect(navigateMock).toHaveBeenCalledWith(['/home']);
    expect(showToastMock).toHaveBeenCalledWith(
      expect.objectContaining({ severity: 'success', detail: expect.stringContaining('Mariana Rojas') })
    );
  });
});
