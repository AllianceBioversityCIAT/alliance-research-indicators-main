// @akili-spec changes/profile-simulation — T-09, T-10, R-IMP-007, R-IMP-008
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal, WritableSignal } from '@angular/core';
import { By } from '@angular/platform-browser';
import { Router } from '@angular/router';
import { SimulateProfileModalComponent } from './simulate-profile-modal.component';
import { UserSearchStepComponent } from './user-search-step/user-search-step.component';
import { ConfirmStepComponent } from './confirm-step/confirm-step.component';
import { AllModalsService } from '@shared/services/cache/all-modals.service';
import { ApiService } from '@shared/services/api.service';
import { ImpersonationService } from '@services/impersonation.service';
import { ActionsService } from '@services/actions.service';
import { WebsocketService } from '@sockets/websocket.service';
import { CacheService } from '@shared/services/cache/cache.service';
import { ImpersonationUserRow } from '@interfaces/impersonation.interface';

/**
 * T-10: once `step()` reaches `'confirm'`, this component's template
 * instantiates the REAL `ConfirmStepComponent` (standalone composition, not
 * DI substitution — same pattern as `UserSearchStepComponent` above), which
 * injects `ImpersonationService`/`WebsocketService`/`ActionsService`/`Router`/
 * `CacheService`. None of the tests below drive the confirm step's own
 * `start()` call (that behaviour is `confirm-step.component.spec.ts`'s
 * job) — these are inert stubs so change detection can resolve DI.
 */
const confirmStepDiStubs = [
  { provide: ImpersonationService, useValue: { start: jest.fn() } },
  { provide: WebsocketService, useValue: { configUser: jest.fn() } },
  { provide: ActionsService, useValue: { showToast: jest.fn() } },
  { provide: Router, useValue: { navigate: jest.fn() } },
  { provide: CacheService, useValue: { dataCache: () => ({ user: { first_name: 'Ana', last_name: 'Sandoval' } }) } }
];

/**
 * Advisory-1 fixture: a fake `AllModalsService` backed by a REAL signal,
 * mirroring the production `modalConfig: WritableSignal<Record<ModalName,
 * ModalConfig>>` shape closely enough to reproduce the bug — `isModalOpen`
 * reads through the WHOLE `modalConfig` signal (as the real service does),
 * so any write to an UNRELATED modal key still invalidates it.
 */
function makeSignalBackedAllModalsFake() {
  const modalConfig = signal<Record<string, { isOpen: boolean }>>({
    simulateProfile: { isOpen: false },
    createResult: { isOpen: false }
  });
  const setModalOpen = (name: string, open: boolean) =>
    modalConfig.update(c => ({ ...c, [name]: { ...c[name], isOpen: open } }));
  return {
    modalConfig,
    setModalOpen,
    isModalOpen: (name: string) => modalConfig()[name],
    closeModal: jest.fn((name: string) => setModalOpen(name, false))
  };
}

const testUser: ImpersonationUserRow = {
  sec_user_id: 1042,
  first_name: 'Mariana',
  last_name: 'Rojas',
  email: 'm.rojas@cgiar.org',
  is_active: true,
  roles: [{ role_id: 1, name: 'Contributor' }],
  simulable: true
};

describe('SimulateProfileModalComponent', () => {
  let fixture: ComponentFixture<SimulateProfileModalComponent>;
  let component: SimulateProfileModalComponent;
  let isOpen: WritableSignal<boolean>;

  beforeEach(async () => {
    isOpen = signal(false);

    await TestBed.configureTestingModule({
      imports: [SimulateProfileModalComponent],
      providers: [
        {
          provide: AllModalsService,
          // Reads a real signal internally so the component's `effect()` in
          // the constructor tracks it — a plain jest.fn() returning a
          // static value would never notify the effect of a later change.
          useValue: { isModalOpen: jest.fn(() => ({ isOpen: isOpen() })), closeModal: jest.fn() }
        },
        // UserSearchStepComponent is a real, directly-imported child
        // (standalone composition, not DI) — it needs ApiService resolved
        // even though these tests never trigger a search. `startImpersonation`
        // is included so the "Finding 2" Escape test below can assert it was
        // never called — a real seam, not a placeholder (Reviewer, attempt-2).
        { provide: ApiService, useValue: { searchImpersonationUsers: jest.fn(), startImpersonation: jest.fn() } },
        ...confirmStepDiStubs
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(SimulateProfileModalComponent);
    component = fixture.componentInstance;
  });

  it('constructs with the modal closed and renders nothing (KZ-015: arrange the transition, not the end state)', () => {
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('[data-testid="simulate-profile-modal"]')).toBeNull();
  });

  it('renders the search step, starting on the search step, once the modal opens', () => {
    fixture.detectChanges();

    isOpen.set(true);
    fixture.detectChanges();

    expect(component.step()).toBe('search');
    expect(fixture.nativeElement.querySelector('[data-testid="simulate-profile-modal"]')).toBeTruthy();
    expect(fixture.debugElement.query(By.directive(UserSearchStepComponent))).toBeTruthy();
  });

  it('advances to the confirm step and stores the selected user when the search step emits userSelected', () => {
    fixture.detectChanges();
    isOpen.set(true);
    fixture.detectChanges();

    const searchStep = fixture.debugElement.query(By.directive(UserSearchStepComponent)).componentInstance as UserSearchStepComponent;
    searchStep.userSelected.emit(testUser);
    fixture.detectChanges();

    expect(component.step()).toBe('confirm');
    expect(component.selectedUser()).toEqual(testUser);
    // The search step must no longer be rendered once the switch has moved
    // past it — the confirm step (T-10) takes its place.
    expect(fixture.debugElement.query(By.directive(UserSearchStepComponent))).toBeNull();
    expect(fixture.debugElement.query(By.directive(ConfirmStepComponent))).toBeTruthy();
  });

  it('T-10 wiring — closes the modal (does not go back to search) when the confirm step emits back', () => {
    fixture.detectChanges();
    isOpen.set(true);
    fixture.detectChanges();
    component.onUserSelected(testUser);
    fixture.detectChanges();

    const allModals = TestBed.inject(AllModalsService) as unknown as { closeModal: jest.Mock };
    const confirmStep = fixture.debugElement.query(By.directive(ConfirmStepComponent)).componentInstance as ConfirmStepComponent;
    confirmStep.back.emit();

    expect(allModals.closeModal).toHaveBeenCalledWith('simulateProfile');
  });

  it('onUserSelected switches the step and sets selectedUser directly', () => {
    fixture.detectChanges();
    isOpen.set(true);
    fixture.detectChanges();

    component.onUserSelected(testUser);

    expect(component.step()).toBe('confirm');
    expect(component.selectedUser()).toEqual(testUser);
  });

  it('resets to the search step and clears the selected user on reopen', () => {
    fixture.detectChanges();
    isOpen.set(true);
    fixture.detectChanges();
    component.onUserSelected(testUser);
    fixture.detectChanges();
    expect(component.step()).toBe('confirm');

    isOpen.set(false);
    fixture.detectChanges();
    isOpen.set(true);
    fixture.detectChanges();

    expect(component.step()).toBe('search');
    expect(component.selectedUser()).toBeNull();
  });

  describe('Finding 2 — Escape-to-close (the wrapper only implements the Tab trap)', () => {
    it('closes the modal via allModals.closeModal, with no other side effect, when the modal is open — and R-IMP-008 BUT: Escape never calls startImpersonation', () => {
      fixture.detectChanges();
      isOpen.set(true);
      fixture.detectChanges();
      component.onUserSelected(testUser);
      fixture.detectChanges();
      expect(component.step()).toBe('confirm');

      const allModals = TestBed.inject(AllModalsService) as unknown as { closeModal: jest.Mock };
      // Reviewer (attempt-2): this drives Escape against the REAL, rendered
      // ConfirmStepComponent (step() is already 'confirm' above), so a
      // regression that wires Escape into a call — or into confirming rather
      // than closing — makes THIS assertion fail, not just the closeModal one.
      const api = TestBed.inject(ApiService) as unknown as { startImpersonation: jest.Mock };
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));

      expect(allModals.closeModal).toHaveBeenCalledWith('simulateProfile');
      expect(allModals.closeModal).toHaveBeenCalledTimes(1);
      expect(api.startImpersonation).not.toHaveBeenCalled();
      // The Escape handler itself has no side effect beyond the close call —
      // it does not also mutate step/selectedUser.
      expect(component.step()).toBe('confirm');
      expect(component.selectedUser()).toEqual(testUser);
    });

    it('is a no-op when the modal is not open', () => {
      fixture.detectChanges(); // isOpen stays false

      const allModals = TestBed.inject(AllModalsService) as unknown as { closeModal: jest.Mock };
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));

      expect(allModals.closeModal).not.toHaveBeenCalled();
    });
  });

});

// Separate top-level `describe` (own TestBed lifecycle) — nesting this under
// `describe('SimulateProfileModalComponent', ...)` above collides with that
// describe's own `beforeEach`, which already calls
// `TestBed.configureTestingModule` + `createComponent` for every test in its
// tree, including nested ones.
describe('SimulateProfileModalComponent — advisory 1: reopen-reset gates on the isModalOpen false->true edge only', () => {
  let signalFixture: ComponentFixture<SimulateProfileModalComponent>;
  let signalComponent: SimulateProfileModalComponent;
  let fakeAllModals: ReturnType<typeof makeSignalBackedAllModalsFake>;

  beforeEach(async () => {
    fakeAllModals = makeSignalBackedAllModalsFake();

    await TestBed.configureTestingModule({
      imports: [SimulateProfileModalComponent],
      providers: [
        { provide: AllModalsService, useValue: fakeAllModals },
        { provide: ApiService, useValue: { searchImpersonationUsers: jest.fn() } },
        ...confirmStepDiStubs
      ]
    }).compileComponents();

    signalFixture = TestBed.createComponent(SimulateProfileModalComponent);
    signalComponent = signalFixture.componentInstance;
  });

  it('does NOT reset an in-progress confirm step when an UNRELATED modal config write happens while simulateProfile stays open', () => {
    signalFixture.detectChanges();
    fakeAllModals.setModalOpen('simulateProfile', true);
    signalFixture.detectChanges();

    signalComponent.onUserSelected(testUser);
    signalFixture.detectChanges();
    expect(signalComponent.step()).toBe('confirm');

    // Write to a DIFFERENT modal key entirely — `simulateProfile.isOpen`
    // does not change value, only the enclosing `modalConfig` object
    // reference does (the real service always spreads a new object).
    fakeAllModals.setModalOpen('createResult', true);
    signalFixture.detectChanges();

    expect(signalComponent.step()).toBe('confirm');
    expect(signalComponent.selectedUser()).toEqual(testUser);
  });

  it('still resets on a genuine false->true reopen edge', () => {
    signalFixture.detectChanges();
    fakeAllModals.setModalOpen('simulateProfile', true);
    signalFixture.detectChanges();
    signalComponent.onUserSelected(testUser);
    signalFixture.detectChanges();
    expect(signalComponent.step()).toBe('confirm');

    fakeAllModals.setModalOpen('simulateProfile', false);
    signalFixture.detectChanges();
    fakeAllModals.setModalOpen('simulateProfile', true);
    signalFixture.detectChanges();

    expect(signalComponent.step()).toBe('search');
    expect(signalComponent.selectedUser()).toBeNull();
  });
});
