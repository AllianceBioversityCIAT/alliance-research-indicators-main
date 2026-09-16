// Delegation History Component spec.
//
// Discriminating proofs (KZ-001/KZ-015):
//   1. byProject context fetches with project_id param (NOT delegate_user_id).
//   2. byPerson context fetches with delegate_user_id param (NOT project_id).
//   3. 'assign' entry renders "granted ... to {name}" + GRANTED badge (not REVOKED).
//   4. 'revoke' entry renders "revoked ... of {name}" + REVOKED badge (not GRANTED).
//      Discriminator: assign must NOT show "revoked"; revoke must NOT show "granted".
//   5. Date formatting: DD/MM/YYYY + 12-hour time + tz abbreviation shape.
//   6. Loading state shown during fetch (KZ-015: transition from closed->open).
//   7. Empty state ("No history yet") when response.data === [].
//   8. Error state when request fails (successfulRequest=false).
//   9. State cleared on open->close transition (KZ-015).
//  10. Closed->open guard: state not populated while modal is closed (KZ-015).
//
// K-020: --coverage=false for single-file runs.
//
// NOTE on async patterns:
//   The component's loadHistory() is a native async/await function (ES2022 target).
//   Angular 19's Zone.js fakeAsync cannot intercept native async/await microtasks —
//   only Zone.js-patched .then() chains are trackable by tick().
//   Consequence: all tests that wait for loadHistory() to complete use the
//   `async` / `fixture.whenStable()` pattern instead of fakeAsync/tick().
//   Purely synchronous assertions (initial state, helpers) remain synchronous.

import {
  ComponentFixture,
  TestBed
} from '@angular/core/testing';
import { signal } from '@angular/core';
import { By } from '@angular/platform-browser';
import { PiDelegateHistoryComponent } from './pi-delegate-history.component';
import { AllModalsService } from '@services/cache/all-modals.service';
import { ApiService } from '@services/api.service';
import type { PiDelegateHistoryEntry } from '@interfaces/pi-delegates.interface';
import type { MainResponse } from '@interfaces/responses.interface';

// ---- Factories ---------------------------------------------------------------

function makeEntry(overrides: Partial<PiDelegateHistoryEntry> = {}): PiDelegateHistoryEntry {
  return {
    pi_delegate_history_id: 1,
    action: 'assign',
    actor: { user_id: 10, name: 'Jane Smith' },
    delegate: { user_id: 20, name: 'Alice Delegate' },
    project: { project_code: 'PRJ-001', project_name: 'Alpha Research' },
    created_at: '2026-03-14T10:12:00.000Z',
    ...overrides
  };
}

function makeResponse(entries: PiDelegateHistoryEntry[]): MainResponse<PiDelegateHistoryEntry[]> {
  return {
    data: entries,
    status: 200,
    description: 'OK',
    timestamp: new Date().toISOString(),
    path: '/api/pi-delegates/history',
    successfulRequest: true,
    errorDetail: { errors: '', detail: '', description: '' }
  };
}

function makeErrorResponse(): MainResponse<PiDelegateHistoryEntry[]> {
  return {
    data: [],
    status: 500,
    description: 'Error',
    timestamp: new Date().toISOString(),
    path: '/api/pi-delegates/history',
    successfulRequest: false,
    errorDetail: { errors: 'Internal Server Error', detail: '', description: '' }
  };
}

// ---- Stubs -------------------------------------------------------------------

class MockAllModalsService {
  private _modalConfig = signal<Record<string, { isOpen: boolean; title: string }>>({
    piDelegateHistory: { isOpen: false, title: 'Delegation History' }
  });

  piDelegateHistoryContext = signal<
    | { source: 'byProject'; projectCode: string; projectName: string | null }
    | { source: 'byPerson'; delegateUserId: number; name: string | null }
    | null
  >(null);

  modalConfig = this._modalConfig;

  isModalOpen(name: string) {
    return this._modalConfig()[name] ?? { isOpen: false };
  }

  openModal(name: string) {
    this._modalConfig.update(m => ({
      ...m,
      [name]: { ...m[name], isOpen: true }
    }));
  }

  closeModal(name: string) {
    this._modalConfig.update(m => ({
      ...m,
      [name]: { ...m[name], isOpen: false }
    }));
  }
}

class MockApiService {
  /** Set this before triggering the action under test. Defaults to an empty success response. */
  nextResponse: MainResponse<PiDelegateHistoryEntry[]> = makeResponse([]);
  /** Set to an Error before triggering to simulate a thrown fetch. */
  nextError: Error | null = null;

  /** All argument objects passed to GET_PIDelegatesHistory, in call order. */
  callArgs: Array<{ project_id?: string; delegate_user_id?: number }> = [];

  GET_PIDelegatesHistory(
    params: { project_id?: string; delegate_user_id?: number }
  ): Promise<MainResponse<PiDelegateHistoryEntry[]>> {
    this.callArgs.push(params);
    const { nextResponse, nextError } = this;
    if (nextError) {
      return Promise.reject(nextError);
    }
    return Promise.resolve(nextResponse);
  }

  /** How many times GET_PIDelegatesHistory has been called. */
  get callCount(): number {
    return this.callArgs.length;
  }

  /** Reset state between tests. */
  reset(): void {
    this.callArgs = [];
    this.nextResponse = makeResponse([]);
    this.nextError = null;
  }
}

// ---- Helpers -----------------------------------------------------------------

/**
 * Open the modal and wait for the async loadHistory() chain to complete.
 *
 * Uses async/whenStable() because Angular 19 compiles to ES2022 — native
 * async/await in V8 does NOT go through Zone.js's patched Promise constructor,
 * so tick()/flushMicrotasks() cannot drain it. fixture.whenStable() waits for
 * the real JavaScript event loop to empty, which covers native async/await.
 *
 * Sequence:
 *   1. openModal() — mutates the isOpen signal
 *   2. detectChanges() — schedules the effect (it fires asynchronously)
 *   3. whenStable() — waits until all pending async work (effect + loadHistory) completes
 *   4. detectChanges() — propagate any signal updates to the OnPush template
 */
async function openModalAndWait(
  modalService: MockAllModalsService,
  fixture: ComponentFixture<PiDelegateHistoryComponent>
): Promise<void> {
  modalService.openModal('piDelegateHistory');
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();
}

// ---- Test suite --------------------------------------------------------------

describe('PiDelegateHistoryComponent', () => {
  let fixture: ComponentFixture<PiDelegateHistoryComponent>;
  let component: PiDelegateHistoryComponent;
  let modalService: MockAllModalsService;
  let apiService: MockApiService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PiDelegateHistoryComponent],
      providers: [
        { provide: AllModalsService, useClass: MockAllModalsService },
        { provide: ApiService, useClass: MockApiService }
      ]
    }).compileComponents();

    modalService = TestBed.inject(AllModalsService) as unknown as MockAllModalsService;
    apiService = TestBed.inject(ApiService) as unknown as MockApiService;

    fixture = TestBed.createComponent(PiDelegateHistoryComponent);
    component = fixture.componentInstance;

    // KZ-015: construct in the CLOSED state.
    fixture.detectChanges();
  });

  afterEach(() => {
    apiService.reset();
  });

  // 1. byProject context fetches with project_id (NOT delegate_user_id) ----------

  describe('byProject context (1)', () => {
    it('fetches with project_id param when source is byProject', async () => {
      // Start closed
      expect(modalService.isModalOpen('piDelegateHistory').isOpen).toBe(false);
      expect(apiService.callCount).toBe(0);

      // Transition: set context + open
      modalService.piDelegateHistoryContext.set({
        source: 'byProject',
        projectCode: 'PRJ-001',
        projectName: 'Alpha Research'
      });
      await openModalAndWait(modalService, fixture);

      // KZ-014: must have been called with project_id (not delegate_user_id)
      expect(apiService.callCount).toBe(1);
      const callArg = apiService.callArgs[0];
      expect(callArg).toHaveProperty('project_id', 'PRJ-001');
      expect(callArg).not.toHaveProperty('delegate_user_id');
    });

    it('does NOT fetch while the modal is closed (KZ-015 guard)', () => {
      // Initial closed state: no calls
      expect(apiService.callCount).toBe(0);
    });
  });

  // 2. byPerson context fetches with delegate_user_id (NOT project_id) ----------

  describe('byPerson context (2)', () => {
    it('fetches with delegate_user_id param when source is byPerson', async () => {
      modalService.piDelegateHistoryContext.set({
        source: 'byPerson',
        delegateUserId: 42,
        name: 'Alice Delegate'
      });
      await openModalAndWait(modalService, fixture);

      // KZ-014: must have been called with delegate_user_id (not project_id)
      expect(apiService.callCount).toBe(1);
      const callArg = apiService.callArgs[0];
      expect(callArg).toHaveProperty('delegate_user_id', 42);
      expect(callArg).not.toHaveProperty('project_id');
    });
  });

  // 3. 'assign' entry renders "granted" + GRANTED badge (not REVOKED) ----------

  describe('assign entry rendering (3)', () => {
    it('renders "granted the PI Delegate role to" text for assign (KZ-014 discriminator)', async () => {
      apiService.nextResponse = makeResponse([makeEntry({ action: 'assign' })]);
      modalService.piDelegateHistoryContext.set({
        source: 'byProject',
        projectCode: 'PRJ-001',
        projectName: null
      });
      await openModalAndWait(modalService, fixture);

      const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
      expect(text).toContain('granted');
      expect(text).toContain('Alice Delegate');
    });

    it('assign entry renders GRANTED badge, NOT revoked badge (KZ-014: negative discriminator)', async () => {
      apiService.nextResponse = makeResponse([makeEntry({ action: 'assign' })]);
      modalService.piDelegateHistoryContext.set({
        source: 'byProject',
        projectCode: 'PRJ-001',
        projectName: null
      });
      await openModalAndWait(modalService, fixture);

      const granted = fixture.debugElement.query(By.css('.pi-dh__badge--granted'));
      const revoked = fixture.debugElement.query(By.css('.pi-dh__badge--revoked'));

      expect(granted).not.toBeNull();
      // KZ-014: must NOT show revoked badge for assign
      expect(revoked).toBeNull();
      expect((granted!.nativeElement as HTMLElement).textContent?.toUpperCase()).toContain('GRANTED');
    });
  });

  // 4. 'revoke' entry renders "revoked" + REVOKED badge (not GRANTED) ----------

  describe('revoke entry rendering (4)', () => {
    it('renders "revoked the PI Delegate role of" text for revoke (KZ-014 discriminator)', async () => {
      apiService.nextResponse = makeResponse([makeEntry({ action: 'revoke' })]);
      modalService.piDelegateHistoryContext.set({
        source: 'byProject',
        projectCode: 'PRJ-001',
        projectName: null
      });
      await openModalAndWait(modalService, fixture);

      const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
      expect(text).toContain('revoked');
      expect(text).toContain('Alice Delegate');
    });

    it('revoke entry renders REVOKED badge, NOT granted badge (KZ-014: negative discriminator)', async () => {
      apiService.nextResponse = makeResponse([makeEntry({ action: 'revoke' })]);
      modalService.piDelegateHistoryContext.set({
        source: 'byProject',
        projectCode: 'PRJ-001',
        projectName: null
      });
      await openModalAndWait(modalService, fixture);

      const revoked = fixture.debugElement.query(By.css('.pi-dh__badge--revoked'));
      const granted = fixture.debugElement.query(By.css('.pi-dh__badge--granted'));

      expect(revoked).not.toBeNull();
      // KZ-014: must NOT show granted badge for revoke
      expect(granted).toBeNull();
      expect((revoked!.nativeElement as HTMLElement).textContent?.toUpperCase()).toContain('REVOKED');
    });
  });

  // 5. Date formatting shape: DD/MM/YYYY + 12h time + tz abbreviation ----------

  describe('formatDate helper (5)', () => {
    it('produces a DD/MM/YYYY pattern', () => {
      const result = component.formatDate('2026-03-14T10:12:00.000Z');
      expect(result).toMatch(/\d{2}\/\d{2}\/\d{4}/);
    });

    it('contains "at" separator between date and time', () => {
      const result = component.formatDate('2026-03-14T10:12:00.000Z');
      expect(result).toContain(' at ');
    });

    it('contains AM or PM (12-hour format)', () => {
      const result = component.formatDate('2026-03-14T10:12:00.000Z');
      expect(result).toMatch(/AM|PM/);
    });

    it('contains a parenthesised timezone abbreviation', () => {
      const result = component.formatDate('2026-03-14T10:12:00.000Z');
      expect(result).toMatch(/\(.+\)/);
    });

    it('returns the original string for an invalid date', () => {
      const invalid = 'not-a-date';
      expect(component.formatDate(invalid)).toBe(invalid);
    });
  });

  // 6. Loading state (KZ-015: transition from closed->open) ---------------------

  describe('loading state (6)', () => {
    it('does not show loading spinner when modal is closed (initial state)', () => {
      const loader = fixture.debugElement.query(By.css('.pi-dh__state--loading'));
      expect(loader).toBeNull();
    });

    it('loading signal is false when no fetch has started (initial state)', () => {
      expect(component.loading()).toBe(false);
    });
  });

  // 7. Empty state --------------------------------------------------------------

  describe('empty state (7)', () => {
    it('shows "No history yet" when response has empty data array', async () => {
      // Default nextResponse is makeResponse([]) — explicitly confirm empty list
      apiService.nextResponse = makeResponse([]);
      modalService.piDelegateHistoryContext.set({
        source: 'byProject',
        projectCode: 'PRJ-001',
        projectName: null
      });
      await openModalAndWait(modalService, fixture);

      const emptyEl = fixture.debugElement.query(By.css('.pi-dh__state--empty'));
      expect(emptyEl).not.toBeNull();
      expect((emptyEl.nativeElement as HTMLElement).textContent).toContain('No history yet');
    });
  });

  // 8. Error state --------------------------------------------------------------

  describe('error state (8)', () => {
    it('shows error message when request fails (successfulRequest=false)', async () => {
      apiService.nextResponse = makeErrorResponse();
      modalService.piDelegateHistoryContext.set({
        source: 'byProject',
        projectCode: 'PRJ-001',
        projectName: null
      });
      await openModalAndWait(modalService, fixture);

      const errorEl = fixture.debugElement.query(By.css('.pi-dh__state--error'));
      expect(errorEl).not.toBeNull();
      expect((errorEl.nativeElement as HTMLElement).textContent).toContain(
        'Could not load delegation history'
      );
    });

    it('shows error when the fetch throws a rejected promise', async () => {
      apiService.nextError = new Error('Network error');
      modalService.piDelegateHistoryContext.set({
        source: 'byProject',
        projectCode: 'PRJ-001',
        projectName: null
      });
      await openModalAndWait(modalService, fixture);

      expect(component.error()).toContain('Could not load delegation history');
    });
  });

  // 9. State cleared on open->close transition (KZ-015) -------------------------

  describe('state cleared on close (9)', () => {
    it('clears entries and error when the modal closes after a successful fetch', async () => {
      apiService.nextResponse = makeResponse([makeEntry()]);
      modalService.piDelegateHistoryContext.set({
        source: 'byProject',
        projectCode: 'PRJ-001',
        projectName: null
      });
      await openModalAndWait(modalService, fixture);

      // Verify entries were set
      expect(component.entries().length).toBe(1);

      // Transition: close the modal
      modalService.closeModal('piDelegateHistory');
      fixture.detectChanges();
      await fixture.whenStable();

      // After close: state must be cleared
      expect(component.entries()).toHaveLength(0);
      expect(component.error()).toBeNull();
    });
  });

  // getInitials helper ----------------------------------------------------------

  describe('getInitials helper', () => {
    it('returns first letters of first and last name', () => {
      expect(component.getInitials('Jane Doe')).toBe('JD');
    });

    it('returns first letter only for a single-word name', () => {
      expect(component.getInitials('Alice')).toBe('A');
    });

    it('returns "?" for null', () => {
      expect(component.getInitials(null)).toBe('?');
    });
  });
  // ── 9. Fixed width — the modal must not resize with its content ─────────────

  describe('fixed width', () => {
    it('the content root declares a fixed width, not a content-driven one', () => {
      fixture.detectChanges();
      const root = fixture.nativeElement.querySelector('.pi-dh') as HTMLElement;
      expect(root.className).toContain('w-[860px]');
      expect(root.className).toContain('max-w-[88vw]');
    });
  });
  // ── Modal title + content heading name the subject ────────────────────────

  describe('titles', () => {
    it('leaves the modal header as the plain module name and carries the code in the heading', async () => {
      modalService.piDelegateHistoryContext.set({
        source: 'byProject',
        projectCode: 'A1001',
        projectName: 'EC-Fostering low cadmium and climate-relevant innovations'
      });
      modalService.openModal('piDelegateHistory');
      fixture.detectChanges();
      await fixture.whenStable();
      fixture.detectChanges();

      // The header no longer names the subject — the heading below does.
      expect(modalService.modalConfig()['piDelegateHistory'].title).toBe('Delegation History');

      const heading = fixture.nativeElement.querySelector('.pi-dh__title') as HTMLElement;
      expect(heading.textContent?.replace(/\s+/g, ' ').trim()).toBe(
        'A1001 - EC-Fostering low cadmium and climate-relevant innovations'
      );
      // The code is the emphasised half of the heading.
      const code = heading.querySelector('.pi-dh__title__code') as HTMLElement;
      expect(code.textContent?.trim()).toBe('A1001');
      // the light-grey subheader is gone
      expect(fixture.nativeElement.querySelector('.pi-dh__subheader')).toBeNull();
    });

    it('shows the code alone when the project has no name (no dangling separator)', async () => {
      modalService.piDelegateHistoryContext.set({
        source: 'byProject',
        projectCode: 'A1001',
        projectName: null
      });
      modalService.openModal('piDelegateHistory');
      fixture.detectChanges();
      await fixture.whenStable();
      fixture.detectChanges();

      const heading = fixture.nativeElement.querySelector('.pi-dh__title') as HTMLElement;
      expect(heading.textContent?.replace(/\s+/g, ' ').trim()).toBe('A1001');
    });

    it('names the person when opened from By person, with no code', async () => {
      modalService.piDelegateHistoryContext.set({
        source: 'byPerson',
        delegateUserId: 7,
        name: 'Alison Rose'
      });
      modalService.openModal('piDelegateHistory');
      fixture.detectChanges();
      await fixture.whenStable();
      fixture.detectChanges();

      expect(modalService.modalConfig()['piDelegateHistory'].title).toBe('Delegation History');
      const heading = fixture.nativeElement.querySelector('.pi-dh__title') as HTMLElement;
      expect(heading.textContent?.replace(/\s+/g, ' ').trim()).toBe('Alison Rose');
      expect(heading.querySelector('.pi-dh__title__code')).toBeNull();
    });
  });

  // ── Entry cards stay light: code only, no highlighted names ───────────────

  describe('entry density', () => {
    it('names the project by code only — the full name is not repeated per row', async () => {
      apiService.nextResponse = makeResponse([makeEntry({ action: 'assign' })]);
      // projectName is null in the context, so the heading cannot be the source
      // of the project name: any match below comes from the entry card itself.
      modalService.piDelegateHistoryContext.set({
        source: 'byProject',
        projectCode: 'PRJ-001',
        projectName: null
      });
      await openModalAndWait(modalService, fixture);

      const sentence = fixture.nativeElement.querySelector('.pi-dh__sentence') as HTMLElement;
      expect(sentence.textContent).toContain('PRJ-001');
      expect(sentence.textContent).not.toContain('Alpha Research');
    });

    it('renders the delegate name as plain emphasis, with no highlight background', async () => {
      apiService.nextResponse = makeResponse([makeEntry({ action: 'assign' })]);
      modalService.piDelegateHistoryContext.set({
        source: 'byProject',
        projectCode: 'PRJ-001',
        projectName: null
      });
      await openModalAndWait(modalService, fixture);

      const delegate = fixture.nativeElement.querySelector('.pi-dh__delegate') as HTMLElement;
      expect(delegate.textContent?.trim()).toBe('Alice Delegate');
      expect(delegate.className).toContain('font-semibold');
      // The marker-pen chip is gone: no background, no rounding, no padding.
      expect(delegate.className).not.toContain('bg-');
      expect(delegate.className).not.toContain('rounded');
      expect(delegate.className).not.toContain('px-');
    });

    it('uses the tables typography for the card: Barlow 14px body, Space Grotesk date', async () => {
      apiService.nextResponse = makeResponse([makeEntry({ action: 'assign' })]);
      modalService.piDelegateHistoryContext.set({
        source: 'byProject',
        projectCode: 'PRJ-001',
        projectName: null
      });
      await openModalAndWait(modalService, fixture);

      const sentence = fixture.nativeElement.querySelector('.pi-dh__sentence') as HTMLElement;
      expect(sentence.className).toContain("font-['Barlow']");
      expect(sentence.className).toContain('text-[14px]');
      expect(sentence.className).toContain('atc-grey-800');

      const timestamp = fixture.nativeElement.querySelector('.pi-dh__timestamp') as HTMLElement;
      expect(timestamp.className).toContain("font-['Space_Grotesk']");
      expect(timestamp.className).toContain('text-[12px]');
      expect(timestamp.className).toContain('atc-primary-blue-300');
    });
  });
  // ── Avatar palette + status-style badges ──────────────────────────────────

  describe('entry chrome', () => {
    it('gives each actor a palette derived from their initials', () => {
      // same person → same palette, every time
      expect(component.avatarVariant('Daniela Zuniga Pino')).toBe(
        component.avatarVariant('Daniela Zuniga Pino')
      );

      // different initials → different palettes (not one colour for everyone)
      const variants = ['Daniela Zuniga Pino', 'Manuel Almanzar', 'Alice Delegate', 'Zoe Quinn'].map(
        name => component.avatarVariant(name)
      );
      expect(new Set(variants).size).toBeGreaterThan(1);

      // and every result is one of the five declared palettes
      for (const variant of [...variants, component.avatarVariant(null)]) {
        expect(variant).toMatch(/^pi-dh__avatar--c[0-4]$/);
      }
    });

    it('renders the badge through the shared status tag, not a bespoke pill', async () => {
      apiService.nextResponse = makeResponse([makeEntry({ action: 'assign' })]);
      modalService.piDelegateHistoryContext.set({
        source: 'byProject',
        projectCode: 'PRJ-001',
        projectName: null
      });
      await openModalAndWait(modalService, fixture);

      const tag = fixture.debugElement.query(By.css('app-custom-tag.pi-dh__badge--granted'));
      expect(tag).not.toBeNull();
      const instance = tag.componentInstance as { statusColor?: string; statusBorder?: string };
      expect(instance.statusColor).toBe('var(--ac-green-600)');
      expect(instance.statusBorder).toBe('var(--ac-green-300)');
    });
  });
});
