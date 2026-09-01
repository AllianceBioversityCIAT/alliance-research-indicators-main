// @akili-spec docs/specs/innovation-use/details-page (T-07 — innovation use details page shell)
import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { ActivatedRoute, provideRouter, Router, RouterOutlet } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import InnovationUseDetailsComponent from './innovation-use-details.component';
import { ApiService } from '@shared/services/api.service';
import { ActionsService } from '@shared/services/actions.service';
import { CacheService } from '@shared/services/cache/cache.service';
import { SubmissionService } from '@shared/services/submission.service';
import { VersionWatcherService } from '@shared/services/version-watcher.service';
import { GetInnovationUseLevelsService } from '@shared/services/control-list/get-innovation-use-levels.service';
import { InnovationUseActorItemComponent } from './components/innovation-use-actor-item/innovation-use-actor-item.component';
import { InnovationUseOrganizationItemComponent } from './components/innovation-use-organization-item/innovation-use-organization-item.component';
import { QuantificationItemComponent } from '@components/quantification-item/quantification-item.component';
import { TextareaComponent } from '@shared/components/custom-fields/textarea/textarea.component';
import { InnovationUseLevel } from '@shared/interfaces/get-innovation-use-levels.interface';
import { GetInnovationUseDetails, InnovationUseActor, InnovationUseOrganization } from '@shared/interfaces/get-innovation-use-details.interface';
import { InputComponent } from '@shared/components/custom-fields/input/input.component';
import { InputNumber } from 'primeng/inputnumber';

/** Family D-1: `id = level + 1`. Levels 0-9 -> ids 1-10. */
const LEVELS_FIXTURE: InnovationUseLevel[] = Array.from({ length: 10 }, (_, level) => ({
  id: level + 1,
  level,
  name: `Level ${level} name`,
  definition: `Level ${level} definition`
}));
const idForLevel = (level: number) => level + 1;

const apiService = {
  GET_InnovationUseDetails: jest.fn().mockResolvedValue({ data: new GetInnovationUseDetails(), successfulRequest: true }),
  PATCH_InnovationUseDetails: jest.fn().mockResolvedValue({ data: new GetInnovationUseDetails(), successfulRequest: true }),
  GET_InnovationUseLevels: jest.fn().mockResolvedValue({ data: LEVELS_FIXTURE, successfulRequest: true }),
  GET_ActorTypes: jest.fn().mockResolvedValue({ data: [{ code: 1, name: 'Actor Type 1' }], successfulRequest: true }),
  GET_Institutions: jest.fn().mockResolvedValue({ data: [], successfulRequest: true }),
  GET_InstitutionTypes: jest.fn().mockResolvedValue({ data: [], successfulRequest: true }),
  GET_SubInstitutionTypes: jest.fn((_depthLevel?: number, code?: number) =>
    Promise.resolve({ data: code === 10 ? [{ code: 1, name: 'Sub A' }] : [], successfulRequest: true })
  )
};

const actions = { showToast: jest.fn(), saveCurrentSection: jest.fn() };
const router = { navigate: jest.fn() };
const submission = { isEditableStatus: jest.fn().mockReturnValue(true) };
const versionWatcher = { onVersionChange: jest.fn() };

class CacheServiceMock {
  currentResultId = jest.fn().mockReturnValue(1);
  getCurrentNumericResultId = jest.fn().mockReturnValue(1);
  currentMetadata = jest.fn().mockReturnValue({ result_title: 'Test Title' });
  // Real WritableSignal (not a jest.fn): the real ToPromiseService — exercised by the c11
  // describe block below, which does not mock ApiService — calls `.set()` on this directly, and
  // `app-input`/`app-textarea` read it by calling it. A jest.fn() mock cannot satisfy both.
  currentResultIsLoading = signal(false);
  showSectionHeaderActions = jest.fn().mockReturnValue(false);
  hasSmallScreen = jest.fn().mockReturnValue(false);
  isSidebarCollapsed = jest.fn().mockReturnValue(false);
  loadingCurrentResult = { set: jest.fn() };
  isExternalResult = jest.fn().mockReturnValue(false);
  greenChecks = { set: jest.fn() };
}

const activatedRouteMock = {
  snapshot: {
    paramMap: { get: (key: string): string | null => (key === 'id' ? '1' : null) },
    // T-14's c5 tests reassign `.get` to literals other than 'v1' (results-center, home, etc.) —
    // the explicit `string | null` return type keeps every one of those reassignments structurally
    // assignable, rather than TS narrowing this to the literal union of the values used here.
    queryParamMap: { get: (key: string): string | null => (key === 'version' ? 'v1' : null) }
  }
};

describe('InnovationUseDetailsComponent', () => {
  let component: InnovationUseDetailsComponent;
  let fixture: ComponentFixture<InnovationUseDetailsComponent>;
  let cacheMock: CacheServiceMock;

  beforeEach(async () => {
    jest.clearAllMocks();
    submission.isEditableStatus.mockReturnValue(true);
    apiService.GET_InnovationUseDetails.mockResolvedValue({ data: new GetInnovationUseDetails(), successfulRequest: true });
    apiService.GET_InnovationUseLevels.mockResolvedValue({ data: LEVELS_FIXTURE, successfulRequest: true });
    apiService.PATCH_InnovationUseDetails.mockResolvedValue({ data: new GetInnovationUseDetails(), successfulRequest: true });

    await TestBed.configureTestingModule({
      imports: [InnovationUseDetailsComponent, HttpClientTestingModule],
      providers: [
        { provide: ApiService, useValue: apiService },
        { provide: CacheService, useClass: CacheServiceMock },
        { provide: ActionsService, useValue: actions },
        { provide: Router, useValue: router },
        { provide: SubmissionService, useValue: submission },
        { provide: VersionWatcherService, useValue: versionWatcher },
        { provide: ActivatedRoute, useValue: activatedRouteMock }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(InnovationUseDetailsComponent);
    component = fixture.componentInstance;
    cacheMock = TestBed.inject(CacheService) as unknown as CacheServiceMock;

    // Deterministically flush the root-provided levels catalog service (fire-and-forget in its
    // own constructor) so `levelsService.list()` is populated before assertions run.
    await TestBed.inject(GetInnovationUseLevelsService).main();
    fixture.detectChanges();
  });

  afterEach(() => jest.clearAllMocks());

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // ---------------------------------------------------------------------------------------------
  // c1 — loading state renders the shared skeleton via CacheService.currentResultIsLoading
  // ---------------------------------------------------------------------------------------------
  describe('c1 — loading state', () => {
    it('renders p-skeleton inside the actor card fields when currentResultIsLoading() is true', async () => {
      await component.getData();
      cacheMock.currentResultIsLoading.set(true);
      fixture.detectChanges();

      const skeletons = fixture.debugElement.queryAll(By.css('p-skeleton'));
      expect(skeletons.length).toBeGreaterThan(0);
    });

    it('renders no skeleton when currentResultIsLoading() is false', async () => {
      await component.getData();
      cacheMock.currentResultIsLoading.set(false);
      fixture.detectChanges();

      const skeletons = fixture.debugElement.queryAll(By.css('p-skeleton'));
      expect(skeletons.length).toBe(0);
    });
  });

  // ---------------------------------------------------------------------------------------------
  // c2 — empty state: exactly one blank actor card (rendered count), zero organization/quant cards
  // ---------------------------------------------------------------------------------------------
  describe('c2 — empty state', () => {
    it('renders exactly one Actor card and zero Organization/Quantification cards for an all-empty 200', async () => {
      apiService.GET_InnovationUseDetails.mockResolvedValue({
        data: { innovation_use_level_id: null, innovation_use_level_explanation: null, actors: [], organizations: [], quantifications: [] },
        successfulRequest: true
      });

      await component.getData();
      fixture.detectChanges();

      const actorCards = fixture.debugElement.queryAll(By.directive(InnovationUseActorItemComponent));
      const organizationCards = fixture.debugElement.queryAll(By.directive(InnovationUseOrganizationItemComponent));
      const quantificationCards = fixture.debugElement.queryAll(By.directive(QuantificationItemComponent));

      expect(actorCards.length).toBe(1);
      expect(organizationCards.length).toBe(0);
      expect(quantificationCards.length).toBe(0);
    });
  });

  // ---------------------------------------------------------------------------------------------
  // c3 — a 200 carrying data renders every scalar and every row
  // ---------------------------------------------------------------------------------------------
  describe('c3 — success state with data', () => {
    it('renders every actor, organization, and quantification row from a populated 200', async () => {
      apiService.GET_InnovationUseDetails.mockResolvedValue({
        data: {
          innovation_use_level_id: idForLevel(7),
          innovation_use_level_explanation: 'used across three countries',
          actors: [new InnovationUseActor(), new InnovationUseActor()],
          organizations: [new InnovationUseOrganization()],
          quantifications: [{ id: 9, quantification_number: 4, unit: 'hectares', description: 'note' }]
        },
        successfulRequest: true
      });

      await component.getData();
      fixture.detectChanges();

      expect(component.body().innovation_use_level_id).toBe(idForLevel(7));
      expect(component.body().innovation_use_level_explanation).toBe('used across three countries');
      expect(fixture.debugElement.queryAll(By.directive(InnovationUseActorItemComponent)).length).toBe(2);
      expect(fixture.debugElement.queryAll(By.directive(InnovationUseOrganizationItemComponent)).length).toBe(1);
      expect(fixture.debugElement.queryAll(By.directive(QuantificationItemComponent)).length).toBe(1);

      // REWORK (Issue 4, RK-4 — the spec's only High risk): a signal read on `component.body()`
      // cannot see the id/level trap. Assert the *rendered* callout, which the stepper only shows
      // once it has resolved `selectedLevelId` (an id) to a catalog row by `id` and read that
      // row's `level` — the mutation `[selectedLevelId]="resolvedLevel()"` type-checks but feeds
      // the stepper a level where it expects an id, so it resolves the wrong row and this fails.
      const stepperText = fixture.debugElement.query(By.css('app-innovation-use-level-stepper')).nativeElement.textContent;
      expect(stepperText).toContain('7 - Level 7 name');
    });
  });

  // ---------------------------------------------------------------------------------------------
  // c4 / c5 — error state: distinct from empty, body untouched, no blank actor card, green
  // checks not overwritten with an all-false derived set
  // ---------------------------------------------------------------------------------------------
  describe('c4 / c5 — error state', () => {
    it('sets loadFailed, hands off to ActionsService, and leaves body untouched (DD-11)', async () => {
      const previousBody = component.body();
      apiService.GET_InnovationUseDetails.mockResolvedValue({
        successfulRequest: false,
        errorDetail: { description: 'boom' }
      });

      await component.getData();

      expect(component.loadFailed()).toBe(true);
      expect(actions.showToast).toHaveBeenCalledWith(expect.objectContaining({ severity: 'error' }));
      expect(component.body()).toBe(previousBody);
    });

    it('does not render as a clean empty form and offers no blank actor card in the error state', async () => {
      apiService.GET_InnovationUseDetails.mockResolvedValue({ successfulRequest: false, errorDetail: { description: 'boom' } });

      await component.getData();
      fixture.detectChanges();

      expect(fixture.debugElement.queryAll(By.directive(InnovationUseActorItemComponent)).length).toBe(0);
      expect(fixture.debugElement.queryAll(By.directive(InnovationUseOrganizationItemComponent)).length).toBe(0);
      expect(fixture.nativeElement.textContent).toContain('could not be loaded');
    });

    it('does not overwrite cached green checks with an all-false set derived from the failure', async () => {
      apiService.GET_InnovationUseDetails.mockResolvedValue({ successfulRequest: false, errorDetail: { description: 'boom' } });

      await component.getData();

      // REWORK (Issue 3, decision (b) — recorded honestly, not claimed as a behavioral proof):
      // `greenChecks.set` has zero call sites in innovation-use-details.component.ts (grep-
      // verified, not test-verified) — this component's own getData() never derives an
      // all-false green-check set from a failed GET, so this assertion can only show "the mock
      // was untouched by this component." The mechanism R-IUP-004's scenario actually forbids
      // lives in the real ToPromiseService (shared/services/to-promise.service.ts:16-19,28-33),
      // which sets `greenChecks` unconditionally at request start and only restores it via a
      // second GET in `finalize()` — this describe block mocks ApiService, so that path is
      // bypassed and out of T-07's reach, not exercised here.
      expect(cacheMock.greenChecks.set).not.toHaveBeenCalled();
    });
  });

  // ---------------------------------------------------------------------------------------------
  // c6 / c7 / c8 / c9 — the conditional justification
  // ---------------------------------------------------------------------------------------------
  describe('c6 — conditional justification visibility', () => {
    it('is absent below level 6', () => {
      component.body.set({ ...component.body(), innovation_use_level_id: idForLevel(5) });
      fixture.detectChanges();

      expect(fixture.debugElement.query(By.css('textarea'))).toBeNull();
    });

    it('is present with an asterisk and the required message at level >= 6 while blank', () => {
      component.body.set({ ...component.body(), innovation_use_level_id: idForLevel(6), innovation_use_level_explanation: undefined });
      fixture.detectChanges();

      const textarea = fixture.debugElement.query(By.css('textarea'));
      expect(textarea).not.toBeNull();
      // REWORK (advisory A4): scoped to the `app-textarea` instance itself — the stepper (no
      // level), the actor card (no actor type), and `app-textarea` can all emit "This field is
      // required" page-wide, so a page-wide text search is only correct by accident of today's
      // default body.
      //
      // T-02 (bugfix/innovation-use-draft-save) / R-IUD-003: `app-textarea`'s own binding
      // (`label`/`isRequired`) is deliberately untouched (DD-2) — for a truly blank value its
      // own untrimmed `isInvalid()` still fires, so this remains its message, not a duplicate.
      // The page-owned block (below, in the template) stays silent here because
      // `justificationWhitespaceOnly()` excludes the blank case by construction — it only covers
      // whitespace-only, where `app-textarea`'s own check cannot see the problem.
      const textareaEl = fixture.debugElement.query(By.directive(TextareaComponent));
      expect(textareaEl).not.toBeNull();
      expect(textareaEl.nativeElement.textContent).toContain('Justification');
      expect(textareaEl.nativeElement.textContent).toContain('This field is required');
      // REWORK (T-02 rework, c5 / R-IUD-003 AC.5): the asterisk is proven as a rendered text
      // node, scoped to the `app-textarea` instance itself — not by `.text-red-500` class
      // (disqualified elsewhere in this file, see c10's REWORK at :361-366) and not page-wide
      // (the level stepper's own label also renders a bare `*` and would pass vacuously).
      const hasAsteriskTextNode = Array.from((textareaEl.nativeElement as HTMLElement).querySelectorAll('span')).some(
        span => (span.textContent || '').trim() === '*'
      );
      expect(hasAsteriskTextNode).toBe(true);
    });
  });

  describe('c7 — hide-then-restore never discards the justification', () => {
    it('keeps the typed text after toggling the level down and back up to >= 6', async () => {
      component.onLevelSelected(idForLevel(7));
      component.body.update(current => ({ ...current, innovation_use_level_explanation: 'used across three countries' }));
      fixture.detectChanges();
      await fixture.whenStable();

      component.onLevelSelected(idForLevel(3));
      fixture.detectChanges();
      await fixture.whenStable();
      expect(component.body().innovation_use_level_explanation).toBe('used across three countries');
      expect(fixture.debugElement.query(By.css('textarea'))).toBeNull();

      component.onLevelSelected(idForLevel(7));
      fixture.detectChanges();
      await fixture.whenStable();
      fixture.detectChanges();

      expect(component.body().innovation_use_level_explanation).toBe('used across three countries');
      const textarea = fixture.debugElement.query(By.css('textarea'));
      expect(textarea.nativeElement.value).toBe('used across three countries');
    });
  });

  describe('c8 — evaluated on the resolved level, not the id', () => {
    it('shows the textarea for id 7 (level 6) and hides it for id 6 (level 5)', () => {
      component.body.set({ ...component.body(), innovation_use_level_id: idForLevel(6) });
      fixture.detectChanges();
      expect(fixture.debugElement.query(By.css('textarea'))).not.toBeNull();

      component.body.set({ ...component.body(), innovation_use_level_id: idForLevel(5) });
      fixture.detectChanges();
      expect(fixture.debugElement.query(By.css('textarea'))).toBeNull();
    });
  });

  describe('c9 — level 3 with a blank justification does not block completion', () => {
    it('renders no textarea, no "Justification" label, and no required message for the hidden justification at level 3', () => {
      component.body.set({ ...component.body(), innovation_use_level_id: idForLevel(3), innovation_use_level_explanation: undefined });
      fixture.detectChanges();

      expect(fixture.debugElement.query(By.css('textarea'))).toBeNull();
      expect(fixture.nativeElement.textContent).not.toContain('Justification');
      expect(fixture.nativeElement.textContent).not.toContain('This field is required');
      // REWORK (Issue 5): "does not block completion" is the criterion's other half and has no
      // save path to exercise until buildPayload()/PATCH exist (T-08) — owned by T-08 c14 /
      // T-09 c6, not claimed as discharged here.
    });
  });

  // ---------------------------------------------------------------------------------------------
  // c10 — cards 3 and 4 carry no asterisk; card 2 shows the at-least-one-actor message when empty
  // ---------------------------------------------------------------------------------------------
  describe('c10 — required messaging boundaries', () => {
    it('shows the at-least-one-actor message when actors is empty', () => {
      component.body.set({ ...component.body(), actors: [] });
      fixture.detectChanges();

      expect(fixture.nativeElement.textContent).toContain('At least one actor is required');
    });

    it('does not show the at-least-one-actor message once an actor row exists', () => {
      component.body.set({ ...component.body(), actors: [new InnovationUseActor()] });
      fixture.detectChanges();

      expect(fixture.nativeElement.textContent).not.toContain('At least one actor is required');
    });

    it('renders no asterisk on the Organizations or Other quantitative measures cards', () => {
      component.body.set({
        ...component.body(),
        organizations: [new InnovationUseOrganization()],
        quantifications: [{ id: undefined, quantification_number: undefined, unit: undefined, description: undefined }]
      });
      fixture.detectChanges();

      // REWORK (Issue 1): length-guard first — a card with zero rendered rows would make the
      // asterisk checks below pass vacuously.
      expect(fixture.debugElement.queryAll(By.directive(QuantificationItemComponent)).length).toBe(1);

      const cards = fixture.debugElement.queryAll(By.css('.section-title'));
      const organizationsCard = cards.find(card => card.nativeElement.textContent.trim() === 'ORGANIZATIONS')?.parent?.nativeElement as HTMLElement;
      const quantificationsCard = cards
        .find(card => card.nativeElement.textContent.trim() === 'OTHER QUANTITATIVE MEASURES')
        ?.parent?.nativeElement as HTMLElement;

      // REWORK (Issue 1): the shared quantification card renders its asterisk as a bare `*` text
      // node inside a `<span>` (shared/components/quantification-item/.../quantification-item.component.html),
      // never with `.text-red-500` — a `.text-red-500` query returns null regardless of
      // `[fieldsRequired]`, so it cannot detect the binding this test exists to guard
      // (R-IUP-012 AC.3). Search for the asterisk text node itself instead.
      const hasAsteriskTextNode = (root: HTMLElement) => Array.from(root.querySelectorAll('span')).some(span => span.textContent?.trim() === '*');

      expect(hasAsteriskTextNode(organizationsCard)).toBe(false);
      expect(hasAsteriskTextNode(quantificationsCard)).toBe(false);
      expect(quantificationsCard.textContent).not.toContain('This field is required');
    });
  });

  // ---------------------------------------------------------------------------------------------
  // c12 — unit renders as a free-text input, not a dropdown
  // ---------------------------------------------------------------------------------------------
  describe('c12 — quantification unit is free text', () => {
    it('renders the Unit field as a text input, never a dropdown', () => {
      component.body.set({
        ...component.body(),
        quantifications: [{ id: undefined, quantification_number: undefined, unit: undefined, description: undefined }]
      });
      fixture.detectChanges();

      const quantCard = fixture.debugElement.query(By.directive(QuantificationItemComponent));
      expect(quantCard.query(By.css('p-select'))).toBeNull();
      expect(quantCard.query(By.css('input[placeholder="Write the unit"]'))).not.toBeNull();
    });
  });

  // ---------------------------------------------------------------------------------------------
  // c13 — isEditableStatus() === false: non-interactive/absent controls, values still render
  // ---------------------------------------------------------------------------------------------
  describe('c13 — read-only when not editable', () => {
    beforeEach(async () => {
      apiService.GET_InnovationUseDetails.mockResolvedValue({
        data: {
          innovation_use_level_id: idForLevel(7),
          innovation_use_level_explanation: 'kept value',
          actors: [new InnovationUseActor()],
          organizations: [new InnovationUseOrganization()],
          quantifications: [{ id: 1, quantification_number: 3, unit: 'ha', description: 'note' }]
        },
        successfulRequest: true
      });
      await component.getData();
      submission.isEditableStatus.mockReturnValue(false);
      fixture.detectChanges();
      // PrimeNG's p-inputNumber reflects a changed `[disabled]`/value binding onto its internal
      // native <input> only after its own effect-driven internal state settles (observed
      // empirically) — the component's own `disabled` getter and `body()` value are already
      // correct after the first pass, but the inner element can still be stale. Let the zone
      // stabilize, then run one more check.
      await fixture.whenStable();
      fixture.detectChanges();
    });

    it('disables every stepper button (the disabled DOM property, not a component flag)', () => {
      const buttons = fixture.debugElement.queryAll(By.css('app-innovation-use-level-stepper button'));
      expect(buttons.length).toBeGreaterThan(0);
      buttons.forEach(button => expect((button.nativeElement as HTMLButtonElement).disabled).toBe(true));
    });

    it('disables the justification textarea', () => {
      const textarea = fixture.debugElement.query(By.css('textarea'));
      expect((textarea.nativeElement as HTMLTextAreaElement).disabled).toBe(true);
    });

    it('hides every Add affordance', () => {
      const buttonTexts = fixture.debugElement.queryAll(By.css('button')).map(btn => (btn.nativeElement as HTMLButtonElement).textContent?.trim());
      expect(buttonTexts.some(text => text?.includes('Add other actor'))).toBe(false);
      expect(buttonTexts.some(text => text?.includes('Add other organization'))).toBe(false);
      expect(buttonTexts.some(text => text?.includes('Add other measure'))).toBe(false);
    });

    // REWORK (Issue 2): c13's own wording is "every input, every stepper button, and every
    // add/remove control" — the pre-rework spec asserted the stepper, the textarea, and the three
    // Add buttons only. This test covers the remaining surface: every rendered control inside the
    // three card types, length-guarded so it cannot pass on an empty card set.
    it('disables every input inside the actor, organization, and quantification cards', () => {
      const actorInputs = fixture.debugElement.queryAll(By.css('app-innovation-use-actor-item input'));
      expect(actorInputs.length).toBeGreaterThan(0);
      actorInputs.forEach(input => expect((input.nativeElement as HTMLInputElement).disabled).toBe(true));

      const organizationInputs = fixture.debugElement.queryAll(By.css('app-innovation-use-organization-item input'));
      expect(organizationInputs.length).toBeGreaterThan(0);
      organizationInputs.forEach(input => expect((input.nativeElement as HTMLInputElement).disabled).toBe(true));

      const quantificationControls = fixture.debugElement.queryAll(By.css('app-quantification-item input, app-quantification-item textarea'));
      expect(quantificationControls.length).toBeGreaterThan(0);
      quantificationControls.forEach(control =>
        expect((control.nativeElement as HTMLInputElement | HTMLTextAreaElement).disabled).toBe(true)
      );
    });

    it('hides every remove affordance (actor, organization, and quantification)', () => {
      expect(fixture.debugElement.queryAll(By.css('[aria-label^="Remove actor"]')).length).toBe(0);
      expect(fixture.debugElement.queryAll(By.css('[aria-label^="Remove organization"]')).length).toBe(0);

      // The quantification card's delete icon has no aria-label — it is gated on
      // `submission.isEditableStatus()` directly inside `quantification-item.component.html`,
      // not on the `[disabled]` @Input, so it is queried by its icon class scoped to that card.
      const quantCard = fixture.debugElement.query(By.directive(QuantificationItemComponent));
      expect(quantCard.query(By.css('.pi-times-circle'))).toBeNull();
    });

    it('still renders every stored value', () => {
      // A textarea's value is a form-control property, not text content — assert it directly.
      const textarea = fixture.debugElement.query(By.css('textarea'));
      expect((textarea.nativeElement as HTMLTextAreaElement).value).toBe('kept value');
      expect(fixture.debugElement.queryAll(By.directive(InnovationUseActorItemComponent)).length).toBe(1);
      expect(fixture.debugElement.queryAll(By.directive(InnovationUseOrganizationItemComponent)).length).toBe(1);
      expect(fixture.debugElement.queryAll(By.directive(QuantificationItemComponent)).length).toBe(1);

      // REWORK (Issue 2): the fixture's `unit: 'ha'` and `quantification_number: 3` were never
      // asserted rendered — only the textarea's stored value was.
      const quantCard = fixture.debugElement.query(By.directive(QuantificationItemComponent));
      const unitInput = quantCard.query(By.css('input[placeholder="Write the unit"]'));
      expect((unitInput.nativeElement as HTMLInputElement).value).toBe('ha');
      const numberInput = quantCard.query(By.css('input#minmax-buttons'));
      expect((numberInput.nativeElement as HTMLInputElement).value).toBe('3');
    });
  });

  // ---------------------------------------------------------------------------------------------
  // c14 (T-07) — Back/Next preserve ?version=N. `navigate()` was replaced by `saveData()` in
  // T-08 (§6.7) — these three cases now go through the save-then-navigate flow. `saveData()` is
  // async, so each case awaits it before asserting.
  // ---------------------------------------------------------------------------------------------
  describe('c14 — Back/Next navigation via saveData()', () => {
    it('navigates back to alliance-alignment preserving the version query param', async () => {
      await component.saveData('back');
      expect(router.navigate).toHaveBeenCalledWith(['result', 1, 'alliance-alignment'], { queryParams: { version: 'v1' }, replaceUrl: true });
    });

    it('navigates next to partners preserving the version query param', async () => {
      await component.saveData('next');
      expect(router.navigate).toHaveBeenCalledWith(['result', 1, 'partners'], { queryParams: { version: 'v1' }, replaceUrl: true });
    });

    it('navigates with no query params when version is absent', async () => {
      const routeMock = TestBed.inject(ActivatedRoute) as unknown as typeof activatedRouteMock;
      const original = routeMock.snapshot.queryParamMap.get;
      routeMock.snapshot.queryParamMap.get = () => null;

      await component.saveData('next');

      expect(router.navigate).toHaveBeenCalledWith(['result', 1, 'partners'], { queryParams: undefined, replaceUrl: true });
      routeMock.snapshot.queryParamMap.get = original;
    });
  });

  // ---------------------------------------------------------------------------------------------
  // addActor / addOrganization / addQuantification — pure writes, no auto-save (DD-8)
  // ---------------------------------------------------------------------------------------------
  describe('Add rows do not auto-save (DD-8)', () => {
    it('addActor appends a row and never calls ActionsService.saveCurrentSection', () => {
      const before = component.body().actors.length;
      component.addActor();
      expect(component.body().actors.length).toBe(before + 1);
      expect(actions.saveCurrentSection).not.toHaveBeenCalled();
    });

    it('addOrganization appends a row and never calls ActionsService.saveCurrentSection', () => {
      const before = component.body().organizations.length;
      component.addOrganization();
      expect(component.body().organizations.length).toBe(before + 1);
      expect(actions.saveCurrentSection).not.toHaveBeenCalled();
    });

    it('addQuantification appends a row and never calls ActionsService.saveCurrentSection', () => {
      const before = component.body().quantifications.length;
      component.addQuantification();
      expect(component.body().quantifications.length).toBe(before + 1);
      expect(actions.saveCurrentSection).not.toHaveBeenCalled();
    });

    it('removeActor / removeOrganization / removeQuantification remove the row at that index', () => {
      component.body.set({
        ...component.body(),
        actors: [new InnovationUseActor(), new InnovationUseActor()],
        organizations: [new InnovationUseOrganization(), new InnovationUseOrganization()],
        quantifications: [
          { id: 1, quantification_number: 1, unit: 'a', description: 'a' },
          { id: 2, quantification_number: 2, unit: 'b', description: 'b' }
        ]
      });

      component.removeActor(0);
      component.removeOrganization(0);
      component.removeQuantification(0);

      expect(component.body().actors.length).toBe(1);
      expect(component.body().organizations.length).toBe(1);
      expect(component.body().quantifications[0].id).toBe(2);
    });
  });

  // ---------------------------------------------------------------------------------------------
  // Quantification adaptation at the page boundary (§5.6) — id round-trips by array index
  // ---------------------------------------------------------------------------------------------
  describe('quantification adaptation at the page boundary', () => {
    it('round-trips id through an update without exposing it to the shared card', () => {
      component.body.set({
        ...component.body(),
        quantifications: [{ id: 42, quantification_number: 4, unit: 'hectares', description: 'note' }]
      });

      expect(component.quantificationsView()[0]).toEqual({ number: 4, unit: 'hectares', comments: 'note' });

      component.onQuantificationUpdate(0, { number: 9, unit: 'plots', comments: 'updated' });

      expect(component.body().quantifications[0]).toEqual({
        id: 42,
        quantification_number: 9,
        unit: 'plots',
        description: 'updated'
      });
    });
  });

  // ---------------------------------------------------------------------------------------------
  // Forward pointer #5 — index-keyed reuse: removing a row shifts a later row into a live card
  // instance, and that instance must re-run its own sync logic (organization-item's syncSubTypes).
  // ---------------------------------------------------------------------------------------------
  describe('index-keyed reuse reaches the organization card end-to-end', () => {
    it('re-syncs the sub-type control on the surviving card instance after the row above it is removed', async () => {
      component.body.set({
        ...component.body(),
        organizations: [
          { ...new InnovationUseOrganization(), institution_type_id: 10, is_organization_known: false },
          { ...new InnovationUseOrganization(), institution_type_id: 20, is_organization_known: false }
        ]
      });
      fixture.detectChanges();
      await fixture.whenStable();
      fixture.detectChanges();

      const cardsBefore = fixture.debugElement.queryAll(By.directive(InnovationUseOrganizationItemComponent));
      expect(cardsBefore[0].componentInstance.subTypeOptions().length).toBeGreaterThan(0);
      expect(cardsBefore[1].componentInstance.subTypeOptions().length).toBe(0);

      const survivingInstance = cardsBefore[0].componentInstance;

      component.removeOrganization(0);
      fixture.detectChanges();
      await fixture.whenStable();
      fixture.detectChanges();
      await fixture.whenStable();
      fixture.detectChanges();

      const cardsAfter = fixture.debugElement.queryAll(By.directive(InnovationUseOrganizationItemComponent));
      expect(cardsAfter.length).toBe(1);
      // `track $index` reuses the same component instance for index 0 (not destroy + recreate).
      expect(cardsAfter[0].componentInstance).toBe(survivingInstance);
      expect(cardsAfter[0].componentInstance.subTypeOptions().length).toBe(0);
    });
  });

  // =================================================================================================
  // T-08 — buildPayload() (§6.5). Pure function over body(), asserted directly, no rendering.
  // =================================================================================================
  describe('T-08 buildPayload() — c1: blank actor rows are dropped', () => {
    it('drops a blank added actor row and keeps the one complete row', () => {
      component.body.set({
        ...component.body(),
        actors: [
          { ...new InnovationUseActor(), actor_type_id: 1, sex_age_disaggregation_not_apply: true, actors_count: 4 },
          new InnovationUseActor() // added-but-not-filled: no actor_type_id
        ]
      });

      const payload = component.buildPayload();

      expect(payload.actors.length).toBe(1);
      expect(payload.actors[0].actor_type_id).toBe(1);
    });
  });

  describe('T-08 buildPayload() — c2: blank organization rows are dropped', () => {
    it('drops an organization row identifying neither an institution nor a type', () => {
      component.body.set({
        ...component.body(),
        organizations: [
          { ...new InnovationUseOrganization(), institution_type_id: 10 },
          new InnovationUseOrganization() // touched but never identified
        ]
      });

      const payload = component.buildPayload();

      expect(payload.organizations.length).toBe(1);
      expect(payload.organizations[0].institution_type_id).toBe(10);
    });

    it('keeps a known-organization row identified only by institution_id', () => {
      component.body.set({
        ...component.body(),
        organizations: [{ ...new InnovationUseOrganization(), is_organization_known: true, institution_id: 501 }]
      });

      const payload = component.buildPayload();

      expect(payload.organizations.length).toBe(1);
      expect(payload.organizations[0].institution_id).toBe(501);
    });
  });

  // ---------------------------------------------------------------------------------------------
  // REWORK Issue 1 — the identity predicate is the spec's OR across both paths, not an
  // active-path-only check. Falsifying scenario: a GET returns an organization row identified by
  // `institution_type_id`; the user then ticks "Is the organization known?" but picks no
  // institution. §5.5 deliberately does not clear the abandoned `institution_type_id`, so the row
  // still carries a live identity on the other path and must survive. The old active-path-only
  // predicate dropped it, and an empty `organizations: []` array deactivates every organization
  // row for this result server-side (no early return on empty array) — a silent deletion.
  // ---------------------------------------------------------------------------------------------
  describe('T-08 buildPayload() — Issue 1 fix: organization identity is an OR over both paths', () => {
    it('keeps a saved row toggled to is_organization_known: true with no institution_id picked yet, because institution_type_id still identifies it', () => {
      component.body.set({
        ...component.body(),
        organizations: [
          {
            ...new InnovationUseOrganization(),
            result_institution_type_id: 55,
            institution_type_id: 10,
            is_organization_known: true,
            institution_id: undefined,
            organization_count: 12
          }
        ]
      });

      const payload = component.buildPayload();

      expect(payload.organizations.length).toBe(1);
      expect(payload.organizations[0].result_institution_type_id).toBe(55);

      // Lens C (attempt 3): the OR-predicate fix keeps this row, but hazard (a)'s known-branch
      // nulling then wipes the *other* path's identity — this composed row carries no identity on
      // either path once serialized. That is intentional, not a regression: server-side,
      // `ResultInnovationUseService.update` calls `validateOrganizationsAreIdentified` **before**
      // `dataSource.transaction` (pre-`BEGIN`). It requires `institution_id` whenever
      // `is_organization_known === true`; here it is `undefined`, so the request is rejected with
      // `BadRequestException` before `customSaveInnovationUse`/`deactivateExistingRecords`/`save`
      // ever run. Nothing is written — row 55 keeps `is_active: true` with its original
      // `institution_type_id`/`organization_count` — and the user gets a loud, recoverable 400.
      // This is the deliberate replacement for attempt 1's silent mass deactivation. Do not "fix"
      // this nulling back into a silent-delete to avoid the 400.
      expect(payload.organizations[0].institution_id).toBeUndefined();
      expect(payload.organizations[0].institution_type_id).toBeNull();
      expect(payload.organizations[0].sub_institution_type_id).toBeNull();
      expect(payload.organizations[0].institution_type_custom_name).toBeNull();
    });
  });

  describe('T-08 buildPayload() — c3: fully-absent quantification rows are dropped', () => {
    it('drops a row with number, unit and description all absent', () => {
      component.body.set({
        ...component.body(),
        quantifications: [{ id: undefined, quantification_number: undefined, unit: undefined, description: undefined }]
      });

      expect(component.buildPayload().quantifications.length).toBe(0);
    });

    // Hazard (b): the shared card's real ingress default is '', not undefined/null.
    it('drops a never-touched row whose fields are the adapter default ("", "", undefined) — hazard (b)', () => {
      component.body.set({
        ...component.body(),
        quantifications: [{ id: undefined, quantification_number: undefined, unit: '', description: '' }]
      });

      expect(component.buildPayload().quantifications.length).toBe(0);
    });

    it('keeps a row with only a number, including 0 (0 is a present value, not absent)', () => {
      component.body.set({
        ...component.body(),
        quantifications: [{ id: undefined, quantification_number: 0, unit: '', description: '' }]
      });

      const payload = component.buildPayload();
      expect(payload.quantifications.length).toBe(1);
      expect(payload.quantifications[0].quantification_number).toBe(0);
    });

    it('keeps a row identified only by unit or only by description', () => {
      component.body.set({
        ...component.body(),
        quantifications: [
          { id: undefined, quantification_number: undefined, unit: 'hectares', description: '' },
          { id: undefined, quantification_number: undefined, unit: '', description: 'a note' }
        ]
      });

      expect(component.buildPayload().quantifications.length).toBe(2);
    });
  });

  describe('T-08 buildPayload() — c4: exactly one active count mode per actor row', () => {
    it('aggregate mode sends sex_age_disaggregation_not_apply + actors_count and nulls the four disaggregated fields', () => {
      component.body.set({
        ...component.body(),
        actors: [
          {
            ...new InnovationUseActor(),
            actor_type_id: 1,
            sex_age_disaggregation_not_apply: true,
            actors_count: 6,
            women_youth_count: 4,
            men_youth_count: 2
          }
        ]
      });

      const row = component.buildPayload().actors[0];
      expect(row.sex_age_disaggregation_not_apply).toBe(true);
      expect(row.actors_count).toBe(6);
      expect(row.women_youth_count).toBeNull();
      expect(row.women_not_youth_count).toBeNull();
      expect(row.men_youth_count).toBeNull();
      expect(row.men_not_youth_count).toBeNull();
    });

    it('disaggregated mode sends the four counts and nulls actors_count', () => {
      component.body.set({
        ...component.body(),
        actors: [
          {
            ...new InnovationUseActor(),
            actor_type_id: 1,
            sex_age_disaggregation_not_apply: false,
            women_youth_count: 3,
            men_not_youth_count: 2,
            actors_count: 99
          }
        ]
      });

      const row = component.buildPayload().actors[0];
      expect(row.sex_age_disaggregation_not_apply).toBe(false);
      expect(row.women_youth_count).toBe(3);
      expect(row.men_not_youth_count).toBe(2);
      expect(row.actors_count).toBeNull();
    });

    it('no payload row ever carries a value in both modes at once', () => {
      const modes = [true, false];
      modes.forEach(aggregate => {
        component.body.set({
          ...component.body(),
          actors: [
            {
              ...new InnovationUseActor(),
              actor_type_id: 1,
              sex_age_disaggregation_not_apply: aggregate,
              actors_count: 6,
              women_youth_count: 4
            }
          ]
        });
        const row = component.buildPayload().actors[0];
        const disaggregatedPresent = [row.women_youth_count, row.women_not_youth_count, row.men_youth_count, row.men_not_youth_count].some(
          value => value !== null && value !== undefined
        );
        const aggregatePresent = row.actors_count !== null && row.actors_count !== undefined;
        expect(disaggregatedPresent && aggregatePresent).toBe(false);
      });
    });
  });

  describe('T-08 buildPayload() — c5: no total, no innovation_use_level', () => {
    it('never carries a total key on any actor row', () => {
      component.body.set({
        ...component.body(),
        actors: [{ ...new InnovationUseActor(), actor_type_id: 1, sex_age_disaggregation_not_apply: true, actors_count: 4, total: 4 }]
      });

      expect(Object.keys(component.buildPayload().actors[0])).not.toContain('total');
    });

    it('never carries innovation_use_level at the top level', () => {
      component.body.set({ ...component.body(), innovation_use_level_id: idForLevel(3), innovation_use_level: 3 });

      expect(Object.keys(component.buildPayload())).not.toContain('innovation_use_level');
    });
  });

  describe('T-08 buildPayload() — c6: ids are echoed from the GET, never synthesized', () => {
    it('passes through an id that was present on the row (echoed from a prior GET)', () => {
      component.body.set({
        ...component.body(),
        actors: [{ ...new InnovationUseActor(), result_actors_id: 501, actor_type_id: 1, sex_age_disaggregation_not_apply: true, actors_count: 4 }],
        organizations: [{ ...new InnovationUseOrganization(), result_institution_type_id: 601, institution_type_id: 10 }],
        quantifications: [{ id: 701, quantification_number: 4, unit: 'ha', description: 'note' }]
      });

      const payload = component.buildPayload();
      expect(payload.actors[0].result_actors_id).toBe(501);
      expect(payload.organizations[0].result_institution_type_id).toBe(601);
      expect(payload.quantifications[0].id).toBe(701);
    });

    it('no id repeats across two rows of the same block', () => {
      component.body.set({
        ...component.body(),
        actors: [
          { ...new InnovationUseActor(), result_actors_id: 1, actor_type_id: 1, sex_age_disaggregation_not_apply: true, actors_count: 1 },
          { ...new InnovationUseActor(), result_actors_id: 2, actor_type_id: 2, sex_age_disaggregation_not_apply: true, actors_count: 2 }
        ]
      });

      const ids = component.buildPayload().actors.map(row => row.result_actors_id);
      expect(new Set(ids).size).toBe(ids.length);
    });

    // Disqualifier: a happy-path body assertion alone cannot prove the absence of a synthesis
    // path. These three cases add a row through the real UI-facing methods (`addActor` /
    // `addOrganization` / `addQuantification`) — never constructed with a literal id — and
    // assert the emitted row's id is `undefined`, for every block.
    it('a row added via addActor() has no id, and buildPayload() emits it as undefined', () => {
      component.body.set({ ...component.body(), actors: [] });
      component.addActor();
      component.onActorUpdate(0, { ...component.body().actors[0], actor_type_id: 1, sex_age_disaggregation_not_apply: true, actors_count: 4 });

      expect(component.buildPayload().actors[0].result_actors_id).toBeUndefined();
    });

    it('a row added via addOrganization() has no id, and buildPayload() emits it as undefined', () => {
      component.body.set({ ...component.body(), organizations: [] });
      component.addOrganization();
      component.onOrganizationUpdate(0, { ...component.body().organizations[0], institution_type_id: 10 });

      expect(component.buildPayload().organizations[0].result_institution_type_id).toBeUndefined();
    });

    it('a row added via addQuantification() has no id, and buildPayload() emits it as undefined', () => {
      component.body.set({ ...component.body(), quantifications: [] });
      component.addQuantification();
      component.onQuantificationUpdate(0, { number: 4, unit: 'ha', comments: 'note' });

      expect(component.buildPayload().quantifications[0].id).toBeUndefined();
    });
  });

  describe('T-08 buildPayload() — c7: level toggle never sends an explicit null explanation', () => {
    it('sends the stored explanation unchanged after toggling the level down and back up', () => {
      component.onLevelSelected(idForLevel(7));
      component.body.update(current => ({ ...current, innovation_use_level_explanation: 'used across three countries' }));
      component.onLevelSelected(idForLevel(3));
      component.onLevelSelected(idForLevel(7));

      const payload = component.buildPayload();
      expect(payload.innovation_use_level_explanation).toBe('used across three countries');
      expect(payload.innovation_use_level_explanation).not.toBeNull();
    });
  });

  // buildPayload()-only support check — a pure-function precondition for c13's real assertion
  // below, not the criterion itself (REWORK Issue 6: a save was never actually issued here).
  describe('T-08 buildPayload() — c13 support: an unchanged section round-trips every row', () => {
    it('preserves every already-saved row (with its id) when nothing was edited', () => {
      const loaded: GetInnovationUseDetails = {
        ...new GetInnovationUseDetails(),
        actors: [{ ...new InnovationUseActor(), result_actors_id: 1, actor_type_id: 1, sex_age_disaggregation_not_apply: true, actors_count: 4 }],
        organizations: [{ ...new InnovationUseOrganization(), result_institution_type_id: 2, institution_type_id: 10 }],
        quantifications: [{ id: 3, quantification_number: 4, unit: 'ha', description: 'note' }]
      };
      component.body.set(loaded);

      const payload = component.buildPayload();
      expect(payload.actors.length).toBe(1);
      expect(payload.organizations.length).toBe(1);
      expect(payload.quantifications.length).toBe(1);
      expect(payload.actors[0].result_actors_id).toBe(1);
      expect(payload.organizations[0].result_institution_type_id).toBe(2);
      expect(payload.quantifications[0].id).toBe(3);
    });
  });

  // -------------------------------------------------------------------------------------------------
  // REWORK Issue 6 — c13's real criterion routed through saveData(), not buildPayload() alone:
  // "a save issued while the section is unchanged does not deactivate existing rows." The
  // client-tier mechanism that prevents deactivation is that all three ids reach the actual PATCH
  // call unchanged. The server-side residual (`deactivateExistingRecords`'s actual behavior on a
  // matching id) is out of client-tier reach and is recorded as AR-1-bounded, not claimed as PASS.
  // -------------------------------------------------------------------------------------------------
  describe('T-08 saveData() — c13: an unchanged section sends every existing row\'s id through the actual PATCH', () => {
    it('sends all three previously-saved ids unchanged when saving without editing anything', async () => {
      const loaded: GetInnovationUseDetails = {
        ...new GetInnovationUseDetails(),
        actors: [{ ...new InnovationUseActor(), result_actors_id: 1, actor_type_id: 1, sex_age_disaggregation_not_apply: true, actors_count: 4 }],
        organizations: [{ ...new InnovationUseOrganization(), result_institution_type_id: 2, institution_type_id: 10 }],
        quantifications: [{ id: 3, quantification_number: 4, unit: 'ha', description: 'note' }]
      };
      component.body.set(loaded);

      await component.saveData();

      const [, sent] = apiService.PATCH_InnovationUseDetails.mock.calls[0];
      expect(sent.actors[0].result_actors_id).toBe(1);
      expect(sent.organizations[0].result_institution_type_id).toBe(2);
      expect(sent.quantifications[0].id).toBe(3);
    });
  });

  // buildPayload()-only support check — a pure-function precondition for c14's real assertion
  // below, not the criterion itself (REWORK Issue 6: `not.toThrow()` over class defaults is an
  // assertion no plausible implementation makes false; no PATCH was ever issued here).
  describe('T-08 buildPayload() — c14 support: a partially filled section (level only) builds without error', () => {
    it('builds a payload with a level and zero actor/organization/quantification rows', () => {
      component.body.set({ ...component.body(), innovation_use_level_id: idForLevel(2), actors: [], organizations: [], quantifications: [] });

      expect(() => component.buildPayload()).not.toThrow();
      const payload = component.buildPayload();
      expect(payload.innovation_use_level_id).toBe(idForLevel(2));
      expect(payload.actors).toEqual([]);
    });
  });

  // -------------------------------------------------------------------------------------------------
  // REWORK Issue 6 — c14's real criterion routed through saveData(): a level-only save actually
  // issues a PATCH and succeeds, rather than merely showing a pure function does not throw.
  // -------------------------------------------------------------------------------------------------
  describe('T-08 saveData() — c14: a partially filled section (level only) saves without error', () => {
    it('issues a level-only PATCH and shows a success toast, never an error toast', async () => {
      component.body.set({ ...component.body(), innovation_use_level_id: idForLevel(2), actors: [], organizations: [], quantifications: [] });

      await component.saveData();

      const [, sent] = apiService.PATCH_InnovationUseDetails.mock.calls[0];
      expect(sent).toEqual({ innovation_use_level_id: idForLevel(2), actors: [], organizations: [], quantifications: [] });
      expect(actions.showToast).toHaveBeenCalledWith(expect.objectContaining({ severity: 'success' }));
      expect(actions.showToast).not.toHaveBeenCalledWith(expect.objectContaining({ severity: 'error' }));
    });
  });

  // -------------------------------------------------------------------------------------------------
  // Hazard (a) — organization inactive-path nulling. Not a named c-criterion; flagged by the task
  // brief as a reachable, destructive gap in §6.5 step 3.
  // -------------------------------------------------------------------------------------------------
  describe('T-08 hazard (a) — the inactive organization identity path is nulled', () => {
    it('nulls institution_type_id/sub_institution_type_id/institution_type_custom_name when is_organization_known is true', () => {
      component.body.set({
        ...component.body(),
        organizations: [
          {
            ...new InnovationUseOrganization(),
            is_organization_known: true,
            institution_id: 501,
            institution_type_id: 10,
            sub_institution_type_id: 20,
            institution_type_custom_name: 'stale'
          }
        ]
      });

      const row = component.buildPayload().organizations[0];
      expect(row.institution_id).toBe(501);
      expect(row.institution_type_id).toBeNull();
      expect(row.sub_institution_type_id).toBeNull();
      expect(row.institution_type_custom_name).toBeNull();
    });

    it('nulls institution_id when is_organization_known is false', () => {
      component.body.set({
        ...component.body(),
        organizations: [{ ...new InnovationUseOrganization(), is_organization_known: false, institution_id: 501, institution_type_id: 10 }]
      });

      const row = component.buildPayload().organizations[0];
      expect(row.institution_type_id).toBe(10);
      expect(row.institution_id).toBeNull();
    });

    // Falsifier for this hazard: without the nulling, two rows sharing `institution_type_id: 10`
    // — one of which also carries a known-organization `institution_id` — collide on the
    // server's `type_${institution_type_id}` key and one is silently dropped. This spec proves
    // the *client* payload no longer gives both rows a live `institution_type_id: 10` to collide
    // on: only the row that is actually on the type path keeps it.
    it("closes the removeDuplicates collision: a known-organization row no longer carries a live institution_type_id to collide on", () => {
      component.body.set({
        ...component.body(),
        organizations: [
          { ...new InnovationUseOrganization(), is_organization_known: true, institution_id: 501, institution_type_id: 10 },
          { ...new InnovationUseOrganization(), is_organization_known: false, institution_type_id: 10 }
        ]
      });

      const [known, typed] = component.buildPayload().organizations;
      expect(known.institution_type_id).toBeNull();
      expect(typed.institution_type_id).toBe(10);
    });
  });

  // -------------------------------------------------------------------------------------------------
  // Hazard (b) — quantification "absent" must include falsy/empty text, not just == null. Not a
  // named c-criterion; flagged by the task brief.
  // -------------------------------------------------------------------------------------------------
  describe('T-08 hazard (b) — a never-touched blank quantification row does not survive to the body', () => {
    it('drops the adapter\'s own untouched-row shape: {number: undefined, unit: "", description: ""}', () => {
      // This is exactly what onQuantificationUpdate() writes back for the shared card's first
      // effect-driven emit on a still-blank row (§6.5 step 4's own falsifying scenario).
      component.body.set({ ...component.body(), quantifications: [{ id: undefined, quantification_number: undefined, unit: '', description: '' }] });
      component.onQuantificationUpdate(0, { number: null, unit: '', comments: '' });

      expect(component.buildPayload().quantifications.length).toBe(0);
    });
  });

  // -------------------------------------------------------------------------------------------------
  // Third hazard — the save path consults loadFailed() before issuing a PATCH. Not a named
  // c-criterion; flagged by the task brief as the DD-11 destruction class arriving through a door
  // DD-11 itself does not cover.
  // -------------------------------------------------------------------------------------------------
  describe('T-08 third hazard — saveData() issues nothing while loadFailed() is true', () => {
    it('issues no PATCH when the preceding GET failed, even though isEditableStatus() is true', async () => {
      apiService.GET_InnovationUseDetails.mockResolvedValue({ successfulRequest: false, errorDetail: { description: 'boom' } });
      await component.getData();
      expect(component.loadFailed()).toBe(true);

      await component.saveData();

      expect(apiService.PATCH_InnovationUseDetails).not.toHaveBeenCalled();
    });

    it('still navigates on Back/Next while loadFailed() is true (navigation-only, matching the isEditableStatus() guard)', async () => {
      apiService.GET_InnovationUseDetails.mockResolvedValue({ successfulRequest: false, errorDetail: { description: 'boom' } });
      await component.getData();

      await component.saveData('back');

      expect(apiService.PATCH_InnovationUseDetails).not.toHaveBeenCalled();
      expect(router.navigate).toHaveBeenCalledWith(['result', 1, 'alliance-alignment'], { queryParams: { version: 'v1' }, replaceUrl: true });
    });
  });

  // -------------------------------------------------------------------------------------------------
  // REWORK Issue 3 — the staleness guard's *stale-success* subset. `loadFailed()` only covers a
  // failed GET; this covers the in-flight window of an in-progress (still-pending, not yet
  // failed or succeeded) GET, where `body` still holds the previous version's rows.
  // -------------------------------------------------------------------------------------------------
  describe('T-08 Issue 3 fix — saveData() issues nothing while a GET is in flight', () => {
    it('issues zero PATCH requests when saveData() is called while getData() has not yet resolved', async () => {
      let resolveGet!: (value: { data: GetInnovationUseDetails; successfulRequest: boolean }) => void;
      apiService.GET_InnovationUseDetails.mockImplementation(
        () => new Promise(resolve => { resolveGet = resolve; })
      );
      // If the guard under test is absent, saveData() calls PATCH; keep it a *failure* response so
      // saveData()'s own success branch (which calls getData() again) is never reached — that
      // second call would reuse this same pending mock and hang the test on an unrelated promise
      // instead of failing cleanly on the assertion below.
      apiService.PATCH_InnovationUseDetails.mockResolvedValue({ successfulRequest: false, errorDetail: { errors: 'boom' } });

      const getDataPromise = component.getData(); // not awaited: the GET is still pending
      expect(component.loading()).toBe(true);

      await component.saveData();

      expect(apiService.PATCH_InnovationUseDetails).not.toHaveBeenCalled();

      resolveGet({ data: new GetInnovationUseDetails(), successfulRequest: true });
      await getDataPromise;
      expect(component.loading()).toBe(false);
    });
  });

  // =================================================================================================
  // T-08 — saveData() (§6.7)
  // =================================================================================================
  describe('T-08 saveData() — c9: success toast then re-read (loadingTrigger turns the sidebar tick)', () => {
    it('shows a success toast and calls getData() again after a successful PATCH', async () => {
      const getDataSpy = jest.spyOn(component, 'getData');
      apiService.PATCH_InnovationUseDetails.mockResolvedValue({ data: new GetInnovationUseDetails(), successfulRequest: true });

      await component.saveData();

      expect(actions.showToast).toHaveBeenCalledWith(expect.objectContaining({ severity: 'success' }));
      expect(getDataSpy).toHaveBeenCalled();
      // The re-read is exactly `getData()`, whose own implementation calls the GET that carries
      // `loadingTrigger: true` (that config is asserted directly on `ApiService.GET_InnovationUseDetails`
      // in api.service.spec.ts; here the observable is that saveData() drives a real re-read).
      expect(apiService.GET_InnovationUseDetails).toHaveBeenCalledTimes(1); // no getData() ran before this test — this is save's own re-read
    });
  });

  describe('T-08 saveData() — c10: no PATCH while not editable; a failed PATCH is not swallowed', () => {
    it('issues zero PATCH requests while isEditableStatus() is false', async () => {
      submission.isEditableStatus.mockReturnValue(false);

      await component.saveData();

      expect(apiService.PATCH_InnovationUseDetails).not.toHaveBeenCalled();
    });

    it('surfaces a 400 from ResultStatusGuard through ActionsService rather than swallowing it', async () => {
      // REWORK (Issue 2): the real envelope. `GlobalExceptions` sets `errorDetail.description` to
      // the *exception class name* (`HttpException.initName()` -> `this.constructor.name`), never
      // to a message — a fixture carrying human text in `description` cannot distinguish a fix
      // from the defect it is meant to catch. `errorDetail.errors` carries the actual message.
      apiService.PATCH_InnovationUseDetails.mockResolvedValue({
        successfulRequest: false,
        status: 400,
        description: 'Bad Request',
        errorDetail: {
          description: 'BadRequestException',
          errors: 'Only results in DRAFT, REVISED, SCIENCE_EDITION, KM_CURATION status can be edited'
        }
      });

      await component.saveData();

      expect(actions.showToast).toHaveBeenCalledWith(
        expect.objectContaining({
          severity: 'error',
          detail: 'Only results in DRAFT, REVISED, SCIENCE_EDITION, KM_CURATION status can be edited'
        })
      );
    });
  });

  // -------------------------------------------------------------------------------------------------
  // REWORK Issue 2 — an array-row save error (naming no field this page binds inline) renders in
  // the page-level block rather than being dropped.
  // -------------------------------------------------------------------------------------------------
  describe('T-08 Issue 2 fix — an unaddressed save error renders in a page-level block', () => {
    it('renders an errors message that names no field this page addresses inline', async () => {
      apiService.PATCH_InnovationUseDetails.mockResolvedValue({
        successfulRequest: false,
        status: 400,
        description: 'BadRequestException',
        errorDetail: { description: 'BadRequestException', errors: 'actors.0.actor_type_id must not be empty' }
      });

      await component.saveData();
      fixture.detectChanges();

      expect(component.unaddressedSaveErrors()).toEqual(['actors.0.actor_type_id must not be empty']);
      expect(fixture.nativeElement.textContent).toContain('actors.0.actor_type_id must not be empty');
    });
  });

  // -------------------------------------------------------------------------------------------------
  // REWORK Issue 4 — the most serious finding: nothing previously connected buildPayload() to the
  // wire. Every c1-c7/c13/c14 test called buildPayload() directly; c8/c11/c12 used a mocked PATCH
  // that ignored its arguments. This test captures the actual second argument
  // PATCH_InnovationUseDetails was called with, adversarial on all four axes at once.
  // -------------------------------------------------------------------------------------------------
  describe('T-08 Issue 4 fix — buildPayload() output is what actually reaches PATCH_InnovationUseDetails', () => {
    it('sends the built payload — not the raw body — as the PATCH argument', async () => {
      component.body.set({
        ...component.body(),
        innovation_use_level_id: idForLevel(7),
        innovation_use_level: 7, // server-derived; must never reach the wire
        // T-09: level 7 resolves to level >= 6, so the justification gate (§6.6) requires a
        // non-blank value here or this save would be blocked before ever reaching the PATCH.
        innovation_use_level_explanation: 'used across three countries',
        actors: [
          { ...new InnovationUseActor(), actor_type_id: 1, sex_age_disaggregation_not_apply: true, actors_count: 4, total: 4, women_youth_count: 9 },
          new InnovationUseActor() // blank -> must be dropped
        ],
        organizations: [
          { ...new InnovationUseOrganization(), is_organization_known: true, institution_id: 501 },
          new InnovationUseOrganization() // identity-less -> must be dropped
        ],
        quantifications: [{ id: undefined, quantification_number: undefined, unit: '', description: undefined }] // absent -> dropped
      });

      await component.saveData();

      const [id, sent] = apiService.PATCH_InnovationUseDetails.mock.calls[0];
      expect(id).toBe(1);
      expect(sent.actors).toHaveLength(1);
      expect(Object.keys(sent.actors[0])).not.toContain('total');
      expect(Object.keys(sent)).not.toContain('innovation_use_level');
      expect(sent.organizations).toHaveLength(1);
      expect(sent.quantifications).toHaveLength(0);

      // Lens C (attempt 3): the fixture already seeds an aggregate-mode row
      // (sex_age_disaggregation_not_apply: true, actors_count: 4, women_youth_count: 9) — assert
      // what the hazard-(a) nulling actually put on the wire, giving c4/step 1 a wire-tier check.
      expect(sent.actors[0].women_youth_count).toBeNull();
      expect(sent.actors[0].actors_count).toBe(4);
    });
  });

  describe('T-08 saveData() — c11: level 8 + aggregate OTHER actor + organization + quantification round-trip', () => {
    it('reloads exactly as entered after a successful save, with the derived total rendering 12', async () => {
      const otherActorTypeId = 5;
      component.body.set({
        ...component.body(),
        innovation_use_level_id: idForLevel(8),
        // T-09: level 8 resolves to level >= 6, so the justification gate (§6.6) requires a
        // non-blank value here or this save would be blocked before ever reaching the PATCH.
        innovation_use_level_explanation: 'used across three countries',
        actors: [
          {
            ...new InnovationUseActor(),
            actor_type_id: otherActorTypeId,
            actor_type_custom_name: 'local cooperatives',
            sex_age_disaggregation_not_apply: true,
            actors_count: 12
          }
        ],
        organizations: [{ ...new InnovationUseOrganization(), is_organization_known: true, institution_id: 501 }],
        quantifications: [{ id: undefined, quantification_number: 4, unit: 'hectares', description: 'note' }]
      });

      const serverEcho: GetInnovationUseDetails = {
        ...new GetInnovationUseDetails(),
        innovation_use_level_id: idForLevel(8),
        innovation_use_level_explanation: 'used across three countries',
        actors: [
          {
            ...new InnovationUseActor(),
            result_actors_id: 9,
            actor_type_id: otherActorTypeId,
            actor_type_custom_name: 'local cooperatives',
            sex_age_disaggregation_not_apply: true,
            actors_count: 12,
            total: 12
          }
        ],
        organizations: [{ ...new InnovationUseOrganization(), result_institution_type_id: 8, is_organization_known: true, institution_id: 501 }],
        quantifications: [{ id: 21, quantification_number: 4, unit: 'hectares', description: 'note' }]
      };
      apiService.PATCH_InnovationUseDetails.mockResolvedValue({ data: serverEcho, successfulRequest: true });
      apiService.GET_InnovationUseDetails.mockResolvedValue({ data: serverEcho, successfulRequest: true });

      await component.saveData();
      fixture.detectChanges();
      await fixture.whenStable();
      fixture.detectChanges();

      expect(component.body().innovation_use_level_id).toBe(idForLevel(8));
      expect(component.body().actors[0].actor_type_custom_name).toBe('local cooperatives');
      expect(component.body().organizations[0].institution_id).toBe(501);
      expect(component.body().quantifications[0].description).toBe('note');

      // REWORK (Issue 5): these three can only pass if `body()` was actually replaced by the
      // server's echo — none of these ids exist pre-save. Without a real re-read (echo discarded,
      // or getData() skipped), `body()` keeps the pre-save shape and every one of these is
      // `undefined`.
      expect(component.body().actors[0].result_actors_id).toBe(9);
      expect(component.body().organizations[0].result_institution_type_id).toBe(8);
      expect(component.body().quantifications[0].id).toBe(21);

      // REWORK (Issue 5): "exactly as entered" extended past the original 4 asserted fields.
      expect(component.body().actors[0].actor_type_id).toBe(otherActorTypeId);
      expect(component.body().actors[0].actors_count).toBe(12);
      expect(component.body().actors[0].sex_age_disaggregation_not_apply).toBe(true);
      expect(component.body().quantifications[0].unit).toBe('hectares');
      expect(component.body().quantifications[0].quantification_number).toBe(4);

      const totalEl = fixture.debugElement.query(By.css('.actor-total'));
      expect(totalEl.nativeElement.textContent.trim()).toBe('12');
    });
  });

  describe('T-08 saveData() — c8: client-displayed total equals the server-returned total for the same row', () => {
    it('renders the same total the server echoes back after a save round trip', async () => {
      component.body.set({
        ...component.body(),
        actors: [{ ...new InnovationUseActor(), actor_type_id: 1, sex_age_disaggregation_not_apply: false, women_youth_count: 3, men_not_youth_count: 2 }]
      });

      const serverEcho: GetInnovationUseDetails = {
        ...new GetInnovationUseDetails(),
        actors: [
          {
            ...new InnovationUseActor(),
            result_actors_id: 1,
            actor_type_id: 1,
            sex_age_disaggregation_not_apply: false,
            women_youth_count: 3,
            men_not_youth_count: 2,
            total: 5
          }
        ]
      };
      apiService.PATCH_InnovationUseDetails.mockResolvedValue({ data: serverEcho, successfulRequest: true });
      apiService.GET_InnovationUseDetails.mockResolvedValue({ data: serverEcho, successfulRequest: true });

      await component.saveData();
      fixture.detectChanges();
      await fixture.whenStable();
      fixture.detectChanges();

      const totalEl = fixture.debugElement.query(By.css('.actor-total'));
      expect(totalEl.nativeElement.textContent.trim()).toBe(String(serverEcho.actors[0].total));
    });
  });

  describe('T-08 saveData() — c12: rows deleted before saving are not resurrected by the re-read', () => {
    it('does not bring back a row the user removed before saving', async () => {
      component.body.set({
        ...component.body(),
        actors: [
          { ...new InnovationUseActor(), result_actors_id: 1, actor_type_id: 1, sex_age_disaggregation_not_apply: true, actors_count: 1 },
          { ...new InnovationUseActor(), result_actors_id: 2, actor_type_id: 2, sex_age_disaggregation_not_apply: true, actors_count: 2 }
        ]
      });
      component.removeActor(1); // remove the result_actors_id: 2 row before saving

      const serverEcho: GetInnovationUseDetails = {
        ...new GetInnovationUseDetails(),
        actors: [{ ...new InnovationUseActor(), result_actors_id: 1, actor_type_id: 1, sex_age_disaggregation_not_apply: true, actors_count: 1, total: 1 }]
      };
      apiService.PATCH_InnovationUseDetails.mockResolvedValue({ data: serverEcho, successfulRequest: true });
      apiService.GET_InnovationUseDetails.mockResolvedValue({ data: serverEcho, successfulRequest: true });

      await component.saveData();

      expect(component.body().actors.length).toBe(1);
      expect(component.body().actors.some(row => row.result_actors_id === 2)).toBe(false);
    });
  });

  describe('T-08 — the justification textarea renders an inline field-scoped save error', () => {
    it('renders the error message when it names innovation_use_level_explanation', async () => {
      // T-09: a non-blank justification satisfies the client-side gate (§6.6) so the PATCH is
      // actually issued; this fixture simulates a server-side rejection the client mirror does
      // not itself catch (e.g. a length rule), not the client's own blank-value gate.
      component.body.set({
        ...component.body(),
        innovation_use_level_id: idForLevel(7),
        innovation_use_level_explanation: 'used across three countries'
      });
      apiService.PATCH_InnovationUseDetails.mockResolvedValue({
        successfulRequest: false,
        status: 400,
        description: 'Bad Request',
        errorDetail: { description: 'Bad Request', errors: 'innovation_use_level_explanation is required at this level' }
      });

      await component.saveData();
      fixture.detectChanges();

      expect(component.justificationError()).toBe('innovation_use_level_explanation is required at this level');
      expect(fixture.nativeElement.textContent).toContain('innovation_use_level_explanation is required at this level');
    });

    it('clears the previous save error on the next saveData() call', async () => {
      apiService.PATCH_InnovationUseDetails.mockResolvedValueOnce({
        successfulRequest: false,
        status: 400,
        description: 'Bad Request',
        errorDetail: { description: 'Bad Request', errors: 'innovation_use_level_explanation is required at this level' }
      });
      await component.saveData();
      expect(component.justificationError()).toBeDefined();

      apiService.PATCH_InnovationUseDetails.mockResolvedValue({ data: new GetInnovationUseDetails(), successfulRequest: true });
      await component.saveData();

      expect(component.justificationError()).toBeUndefined();
    });
  });

  // =================================================================================================
  // T-09 — Cross-row validation (§6.6): duplicate actor type, level-6 justification gate, save
  // blocking. Requirements: R-IUP-009 (all 3), R-IUP-010 AC.5, R-IUP-006 AC.2, R-IUP-014 AC.3.
  // =================================================================================================
  const OTHER_ACTOR_TYPE_ID = 5;

  describe('T-09 c1 — duplicate actor type renders the RENDERED card message, not just the computed', () => {
    it('renders the duplicate message on row 2 when row 1 already holds the same actor type', () => {
      component.body.set({
        ...component.body(),
        actors: [
          { ...new InnovationUseActor(), actor_type_id: 1 },
          { ...new InnovationUseActor(), actor_type_id: 1 }
        ]
      });
      fixture.detectChanges();

      const cards = fixture.debugElement.queryAll(By.directive(InnovationUseActorItemComponent));
      expect(cards.length).toBe(2);
      // Disqualifier guard (KZ-002 / task disqualifier): assert the card's `duplicateType` input
      // actually reached true AND that the message renders in the DOM the card owns — not a
      // presence check on the page-level computed alone.
      expect(cards[0].componentInstance.duplicateType).toBe(true);
      expect(cards[1].componentInstance.duplicateType).toBe(true);
      expect(cards[0].nativeElement.textContent).toContain('This actor type has already been reported on another row');
      expect(cards[1].nativeElement.textContent).toContain('This actor type has already been reported on another row');
    });

    it('renders no duplicate message and duplicateType=false when actor types differ', () => {
      component.body.set({
        ...component.body(),
        actors: [
          { ...new InnovationUseActor(), actor_type_id: 1 },
          { ...new InnovationUseActor(), actor_type_id: 2 }
        ]
      });
      fixture.detectChanges();

      const cards = fixture.debugElement.queryAll(By.directive(InnovationUseActorItemComponent));
      expect(cards[0].componentInstance.duplicateType).toBe(false);
      expect(cards[1].componentInstance.duplicateType).toBe(false);
      expect(cards[0].nativeElement.textContent).not.toContain('This actor type has already been reported on another row');
      expect(cards[1].nativeElement.textContent).not.toContain('This actor type has already been reported on another row');
    });

    it('does not flag rows that share no actor_type_id (both blank is the required-field case, not a duplicate)', () => {
      component.body.set({
        ...component.body(),
        actors: [new InnovationUseActor(), new InnovationUseActor()]
      });

      expect(component.duplicateActorTypeIndexes().size).toBe(0);
    });
  });

  describe('T-09 c2 — OTHER (type 5) rows are keyed on trimmed lowercase custom name, not on the shared type id alone', () => {
    it('flags two OTHER rows sharing the same trimmed lowercase custom name', () => {
      component.body.set({
        ...component.body(),
        actors: [
          { ...new InnovationUseActor(), actor_type_id: OTHER_ACTOR_TYPE_ID, actor_type_custom_name: 'Local cooperatives' },
          { ...new InnovationUseActor(), actor_type_id: OTHER_ACTOR_TYPE_ID, actor_type_custom_name: '  local cooperatives  ' }
        ]
      });
      fixture.detectChanges();

      const cards = fixture.debugElement.queryAll(By.directive(InnovationUseActorItemComponent));
      expect(cards[0].componentInstance.duplicateType).toBe(true);
      expect(cards[1].componentInstance.duplicateType).toBe(true);
      expect(cards[0].nativeElement.textContent).toContain('This actor type has already been reported on another row');
    });

    it('does NOT flag two OTHER rows with different custom names (falsifying input: keying on actor_type_id alone would wrongly flag this)', () => {
      component.body.set({
        ...component.body(),
        actors: [
          { ...new InnovationUseActor(), actor_type_id: OTHER_ACTOR_TYPE_ID, actor_type_custom_name: 'Local cooperatives' },
          { ...new InnovationUseActor(), actor_type_id: OTHER_ACTOR_TYPE_ID, actor_type_custom_name: 'National federations' }
        ]
      });
      fixture.detectChanges();

      const cards = fixture.debugElement.queryAll(By.directive(InnovationUseActorItemComponent));
      expect(cards[0].componentInstance.duplicateType).toBe(false);
      expect(cards[1].componentInstance.duplicateType).toBe(false);
      expect(component.duplicateActorTypeIndexes().size).toBe(0);
      expect(cards[0].nativeElement.textContent).not.toContain('This actor type has already been reported on another row');
    });
  });

  describe('T-09 c3 — no PATCH is issued while any row is flagged as a duplicate', () => {
    it('issues zero PATCH requests when two rows share the same actor type', async () => {
      component.body.set({
        ...component.body(),
        actors: [
          { ...new InnovationUseActor(), actor_type_id: 1 },
          { ...new InnovationUseActor(), actor_type_id: 1 }
        ]
      });

      await component.saveData();

      expect(apiService.PATCH_InnovationUseDetails).not.toHaveBeenCalled();
    });
  });

  describe('T-09 c4 — removing the duplicating row clears the flag and re-offers the type', () => {
    it('clears duplicateType on the surviving row once the other duplicate is removed', () => {
      component.body.set({
        ...component.body(),
        actors: [
          { ...new InnovationUseActor(), actor_type_id: 1 },
          { ...new InnovationUseActor(), actor_type_id: 1 }
        ]
      });
      fixture.detectChanges();
      expect(component.duplicateActorTypeIndexes().size).toBe(2);

      component.removeActor(0);
      fixture.detectChanges();

      expect(component.duplicateActorTypeIndexes().size).toBe(0);
      const cards = fixture.debugElement.queryAll(By.directive(InnovationUseActorItemComponent));
      expect(cards.length).toBe(1);
      expect(cards[0].componentInstance.duplicateType).toBe(false);
      expect(cards[0].nativeElement.textContent).not.toContain('This actor type has already been reported on another row');
    });

    it('re-offering the type also un-blocks the save (PATCH is issued once the duplicate is gone)', async () => {
      component.body.set({
        ...component.body(),
        actors: [
          { ...new InnovationUseActor(), actor_type_id: 1, sex_age_disaggregation_not_apply: true, actors_count: 4 },
          { ...new InnovationUseActor(), actor_type_id: 1, sex_age_disaggregation_not_apply: true, actors_count: 2 }
        ]
      });
      component.removeActor(1);

      await component.saveData();

      expect(apiService.PATCH_InnovationUseDetails).toHaveBeenCalledTimes(1);
    });
  });

  describe('T-02 (bugfix/innovation-use-draft-save) c1/c2 — inverts T-09 c5: a blank or whitespace-only justification at resolved level >= 6 now SAVES, and the required message still renders', () => {
    // T-02 c1 / R-IUD-001 AC.1 / KZ-001: both halves — the PATCH and the rendered message — in
    // one test, so a double that renders nothing (or a gate that silently no-ops) cannot pass.
    it('issues exactly one PATCH and still renders the required message while blank at level >= 6', async () => {
      component.body.set({ ...component.body(), innovation_use_level_id: idForLevel(6), innovation_use_level_explanation: undefined });
      fixture.detectChanges();

      expect(component.justificationMissing()).toBe(true);
      expect(fixture.nativeElement.textContent).toContain('This field is required');

      await component.saveData();

      expect(apiService.PATCH_InnovationUseDetails).toHaveBeenCalledTimes(1);
      expect(actions.showToast).toHaveBeenCalledWith(expect.objectContaining({ severity: 'success' }));
      expect(actions.showToast).not.toHaveBeenCalledWith(expect.objectContaining({ severity: 'error' }));
    });

    // T-02 c2 / R-IUD-001 AC.2, sc.2 / R-IUD-003 sc.1: whitespace-only is the exact defect that
    // originally shipped — the guard (trimmed) and the visible message (untrimmed, on
    // `app-textarea` alone) disagreed. This asserts the page's OWN required-message block
    // renders, the PATCH is issued, and the payload carries the whitespace verbatim (DD-3 — it
    // must never be trimmed away before `buildPayload`, or a later deletion could silently fail
    // to persist).
    it('issues exactly one PATCH carrying the whitespace verbatim, and still renders the page-owned required message, while the justification is only whitespace at level >= 6', async () => {
      component.body.set({ ...component.body(), innovation_use_level_id: idForLevel(6), innovation_use_level_explanation: '   ' });
      fixture.detectChanges();

      expect(component.justificationMissing()).toBe(true);
      // Falsifying check (Reviewer FAIL, pre-dating T-02): `app-textarea`'s own built-in message
      // does NOT cover this case even when it was still wired up — its `isInvalid()` is
      // untrimmed length-based and sees a non-empty string, so it renders nothing. Asserting on
      // the page's rendered text proves the page-owned block fired, and T-02's falsifying input
      // (deleting that block) must fail this specific assertion while c1's blank case above
      // still passes.
      expect(fixture.nativeElement.textContent).toContain('This field is required');

      // T-11 c3 — icon AND text, never text alone, for the PAGE'S OWN required-message block.
      // Locate the exact block by its unique text, then assert its sibling icon renders "warning"
      // (a page-wide icon query would also catch the unrelated actor "required" block).
      const requiredSpan = fixture.debugElement
        .queryAll(By.css('span'))
        .find(el => (el.nativeElement.textContent || '').trim() === 'This field is required')!;
      expect(requiredSpan).toBeTruthy();
      const icon = requiredSpan.parent!.query(By.css('i.material-symbols-rounded'));
      expect(icon).toBeTruthy();
      expect((icon.nativeElement.textContent || '').trim()).toBe('warning');

      await component.saveData();

      expect(apiService.PATCH_InnovationUseDetails).toHaveBeenCalledTimes(1);
      expect(apiService.PATCH_InnovationUseDetails).toHaveBeenCalledWith(1, expect.objectContaining({ innovation_use_level_explanation: '   ' }));
    });

    it('renders no required message and issues a PATCH once the justification is filled in at level >= 6', async () => {
      component.body.set({ ...component.body(), innovation_use_level_id: idForLevel(6), innovation_use_level_explanation: 'used across three countries' });
      fixture.detectChanges();

      expect(component.justificationMissing()).toBe(false);
      expect(fixture.nativeElement.textContent).not.toContain('This field is required');

      await component.saveData();

      expect(apiService.PATCH_InnovationUseDetails).toHaveBeenCalledTimes(1);
    });

    it('does not block save at level 3 with a blank justification (the gate is scoped to level >= 6)', async () => {
      component.body.set({ ...component.body(), innovation_use_level_id: idForLevel(3), innovation_use_level_explanation: undefined });

      expect(component.justificationMissing()).toBe(false);
      await component.saveData();

      expect(apiService.PATCH_InnovationUseDetails).toHaveBeenCalledTimes(1);
    });
  });

  describe('T-02 c3 — the message count is exactly 1 / 1 / 0 across blank / whitespace-only / real text (R-IUD-003 AC.1-3)', () => {
    // Scoped to the wrapper around `app-textarea` (not page-wide) — the level stepper and the
    // actor card can each independently emit "This field is required" for their own missing
    // field, so a page-wide count would not isolate the justification field's own message.
    // Counts rendered nodes, not class strings (the task's own disqualifier for this criterion).
    const countRequiredMessageNodes = (): number => {
      const textarea = fixture.debugElement.query(By.css('textarea'))!;
      const wrapper = (textarea.nativeElement as HTMLElement).closest('app-textarea')!.parentElement!;
      return Array.from(wrapper.querySelectorAll('span')).filter(el => (el.textContent || '').trim() === 'This field is required').length;
    };

    it('renders exactly one required-message node for a blank justification', () => {
      component.body.set({ ...component.body(), innovation_use_level_id: idForLevel(6), innovation_use_level_explanation: undefined });
      fixture.detectChanges();

      expect(countRequiredMessageNodes()).toBe(1);
    });

    it('renders exactly one required-message node for a whitespace-only justification', () => {
      component.body.set({ ...component.body(), innovation_use_level_id: idForLevel(6), innovation_use_level_explanation: '   ' });
      fixture.detectChanges();

      expect(countRequiredMessageNodes()).toBe(1);
    });

    it('renders zero required-message nodes once real text is present', () => {
      component.body.set({ ...component.body(), innovation_use_level_id: idForLevel(6), innovation_use_level_explanation: 'used across three countries' });
      fixture.detectChanges();

      expect(countRequiredMessageNodes()).toBe(0);
    });
  });

  describe('T-02 c4 — at resolved level < 6: textarea absent, message absent, and save still fires (R-IUD-001 AC.4, R-IUD-003 AC.4)', () => {
    it('renders no textarea and no required message, and still issues a PATCH, with a blank justification at level 3', async () => {
      component.body.set({ ...component.body(), innovation_use_level_id: idForLevel(3), innovation_use_level_explanation: undefined });
      fixture.detectChanges();

      expect(fixture.debugElement.query(By.css('textarea'))).toBeNull();
      expect(fixture.nativeElement.textContent).not.toContain('Justification');
      expect(fixture.nativeElement.textContent).not.toContain('This field is required');

      await component.saveData();

      expect(apiService.PATCH_InnovationUseDetails).toHaveBeenCalledTimes(1);
    });
  });

  describe('T-09 c6 — zero actor rows: save proceeds, section renders as incomplete rather than as an error', () => {
    it('issues a PATCH when actors is empty (falsifying input: blocking save on zero rows must FAIL this)', async () => {
      component.body.set({ ...component.body(), actors: [] });

      await component.saveData();

      expect(apiService.PATCH_InnovationUseDetails).toHaveBeenCalledTimes(1);
      expect(actions.showToast).toHaveBeenCalledWith(expect.objectContaining({ severity: 'success' }));
      expect(actions.showToast).not.toHaveBeenCalledWith(expect.objectContaining({ severity: 'error' }));
    });

    it('renders the incomplete "at least one actor is required" message rather than any error state when actors is empty', () => {
      component.body.set({ ...component.body(), actors: [] });
      fixture.detectChanges();

      expect(component.hasDuplicateActorType()).toBe(false);
      expect(component.loadFailed()).toBe(false);
      expect(fixture.nativeElement.textContent).toContain('At least one actor is required');
      // Distinct from the error surface (c4/c5's rendered "could not be loaded" block).
      expect(fixture.nativeElement.textContent).not.toContain('could not be loaded');
    });
  });

  // =================================================================================================
  // T-14 (Amendment 01) — level-selector guidance, definitions link, evidence callout + navigation.
  // requirements.md R-IUP-020 / R-IUP-021. Spec-verbatim strings (label, four bullets, P1, P2) are
  // transcribed once here from requirements.md, not retyped per test.
  // =================================================================================================
  describe('T-14 — Amendment 01 guidance blocks', () => {
    /** Collapses incidental template whitespace (line wraps) without hiding a real wording change,
     *  and additionally closes the gap right at "(" / ")" — the one boundary where a reformatted
     *  template could legally insert a single space without normalize() alone catching it. */
    const normalize = (text: string | null | undefined): string =>
      (text ?? '')
        .replace(/\s+/g, ' ')
        .replace(/\(\s+/g, '(')
        .replace(/\s+\)/g, ')')
        .trim();

    const BULLET_1 =
      'In case the innovation use level differs across countries or regions, we advise to assign the highest current innovation use level that can be supported by the evidence provided.';
    const BULLET_2 =
      'Be realistic in assessing the use level of the innovation and keep in mind that the claimed use level needs to be supported by evidence documentation.';
    const BULLET_3 = 'The innovation use level will be quality assessed.';
    const BULLET_4 = 'YOUR USE LEVEL IN JUST 3 CLICKS: TRY THE NEW INNOVATION USE CALCULATOR';
    const P1 =
      'Please provide a brief explanation justifying the selected Innovation Use Level. Make sure you provide the necessary evidence/documentation that support the current innovation use level in the ‘Evidence’ section of the form (Click here to go there)';
    const P2 =
      'Documentation may include idea-notes, concept-notes, technical report, pilot testing report, experimental data paper, newsletter, etc. It may be project reports, scientific publications, book chapters, communication materials that provide evidence of the current development/ maturity stage of the innovation.';
    const CALCULATOR_URL = 'https://www.scalingreadiness.org/calculator-use-headless/';
    const DEFINITIONS_URL = 'https://drive.google.com/file/d/1RFDAx3m5ziisZPcFgYdyBYH9oTzOYLvC/view';

    const findLink = (url: string) =>
      fixture.debugElement.queryAll(By.css('a')).find(a => (a.nativeElement as HTMLAnchorElement).getAttribute('href') === url);

    const findButton = (text: string) =>
      fixture.debugElement.queryAll(By.css('button')).find(b => normalize((b.nativeElement as HTMLButtonElement).textContent) === text);

    // -----------------------------------------------------------------------------------------------
    // c1 — the label's exact string plus the required marker (R-IUP-020 AC.1)
    // -----------------------------------------------------------------------------------------------
    describe('c1 — label', () => {
      it('renders the exact label string with the required marker as a distinct span', () => {
        const labelEl = fixture.debugElement.query(By.css('span.label')).nativeElement as HTMLElement;
        const marker = labelEl.querySelector('span.text-red-500');

        expect(normalize(labelEl.textContent).replace(/\*$/, '').trim()).toBe('How would you assess the current use level of the innovation?');
        expect(marker?.textContent?.trim()).toBe('*');
      });
    });

    // -----------------------------------------------------------------------------------------------
    // c2 — four bullets, in order, exact rendered text per element (R-IUP-020 AC.2)
    // -----------------------------------------------------------------------------------------------
    describe('c2 — guidance bullets', () => {
      it('renders exactly four <li> elements, in order, with the exact strings', () => {
        const items = fixture.debugElement.queryAll(By.css('[data-testid="use-level-guidance"] li'));
        expect(items.length).toBe(4);

        const texts = items.map(item => normalize((item.nativeElement as HTMLElement).textContent));
        expect(texts).toEqual([BULLET_1, BULLET_2, BULLET_3, BULLET_4]);
      });

      // Falsifying input (KZ-014): swapping bullets 2 and 3 must fail this check on ORDER, not
      // merely on presence — proved here by asserting against the swapped-order array directly.
      it('falsifying input: a swapped order (2 and 3) does NOT equal the rendered order', () => {
        const items = fixture.debugElement.queryAll(By.css('[data-testid="use-level-guidance"] li'));
        const texts = items.map(item => normalize((item.nativeElement as HTMLElement).textContent));
        const swapped = [BULLET_1, BULLET_3, BULLET_2, BULLET_4];

        expect(texts).not.toEqual(swapped);
      });
    });

    // -----------------------------------------------------------------------------------------------
    // c3 — both external links: exact URL, target=_blank, rel=noopener noreferrer, discernible name
    // (R-IUP-020 AC.3, AC.4)
    // -----------------------------------------------------------------------------------------------
    describe('c3 — external links', () => {
      it('the calculator link carries the exact URL, target and rel, and a discernible name', () => {
        const link = findLink(CALCULATOR_URL)?.nativeElement as HTMLAnchorElement;
        expect(link).toBeTruthy();
        expect(link.getAttribute('target')).toBe('_blank');
        expect(link.getAttribute('rel')).toBe('noopener noreferrer');
        expect(normalize(link.textContent)).toBe('TRY THE NEW INNOVATION USE CALCULATOR');
      });

      it('the definitions link carries the exact URL, target and rel, and a discernible name', () => {
        const link = findLink(DEFINITIONS_URL)?.nativeElement as HTMLAnchorElement;
        expect(link).toBeTruthy();
        expect(link.getAttribute('target')).toBe('_blank');
        expect(link.getAttribute('rel')).toBe('noopener noreferrer');
        expect(normalize(link.textContent)).toBe('Click here');
      });

      // Falsifying input: dropping `rel="noopener noreferrer"` from one link must fail c3.
      it('falsifying input: a link missing rel="noopener noreferrer" is not a passing link', () => {
        const link = findLink(CALCULATOR_URL)?.nativeElement as HTMLAnchorElement;
        const strippedRel = link.getAttribute('rel')?.replace('noopener noreferrer', '') ?? '';

        expect(strippedRel).not.toBe('noopener noreferrer');
        expect(link.getAttribute('rel')).toBe('noopener noreferrer'); // the real, un-stripped attribute still passes
      });
    });

    // -----------------------------------------------------------------------------------------------
    // c4 — P1 (adapted, with the curly-quote 'Evidence') and P2 (verbatim) (R-IUP-021 AC.1, AC.2)
    // -----------------------------------------------------------------------------------------------
    describe('c4 — evidence callout paragraphs', () => {
      it('renders P1 and P2 with their exact strings', () => {
        const paragraphs = fixture.debugElement.queryAll(By.css('[data-testid="evidence-callout"] p'));
        expect(paragraphs.length).toBe(2);

        expect(normalize((paragraphs[0].nativeElement as HTMLElement).textContent)).toBe(P1);
        expect(normalize((paragraphs[1].nativeElement as HTMLElement).textContent)).toBe(P2);
      });
    });

    // -----------------------------------------------------------------------------------------------
    // c5 — `goToEvidence()` calls Router.navigate with BOTH the commands and the query params
    // (KZ-001: a spy asserted only with toHaveBeenCalled() is not evidence) (R-IUP-021 AC.3, AC.4)
    // -----------------------------------------------------------------------------------------------
    describe('c5 — evidence navigation', () => {
      const routeMock = () => TestBed.inject(ActivatedRoute) as unknown as typeof activatedRouteMock;
      // Hoisted out of each `it` (previously restored as the last statement of every test below):
      // if `goToEvidence()` ever regresses, an `expect(...).toHaveBeenCalledWith(...)` throws
      // mid-test, before a same-test restore line would run. `activatedRouteMock` is a
      // module-level object shared across this whole spec file, so `.get` would then stay
      // poisoned for every test declared after this block. `afterEach` restores it
      // unconditionally — pass or throw.
      let originalGet: typeof activatedRouteMock.snapshot.queryParamMap.get;

      // Bug fix (T-13 human gate): the id assertions below changed from the string `'1'` to the
      // number `1`. Pre-fix, `goToEvidence()` read `route.snapshot.paramMap.get('id')` — always a
      // string (or `null`, undetected here because `activatedRouteMock` is flat and always answers
      // `'1'` regardless of tree depth — see the separate faithful-route-tree describe block below
      // in this file for the reproduction that catches what this mock cannot). Post-fix, the id
      // comes from `cache.currentResultId()`, and `CacheServiceMock.currentResultId` (top of this
      // file) returns the number `1` — matching this component's own `navigateTo()`, whose c14
      // tests already asserted a numeric `1`, not a string.
      beforeEach(() => {
        originalGet = routeMock().snapshot.queryParamMap.get;
      });

      afterEach(() => {
        routeMock().snapshot.queryParamMap.get = originalGet;
      });

      it('activating "Click here to go there" navigates with commands AND version+from query params', () => {
        routeMock().snapshot.queryParamMap.get = (key: string) => (key === 'version' ? 'v1' : key === 'from' ? 'results-center' : null);

        const button = findButton('Click here to go there')!;
        (button.nativeElement as HTMLButtonElement).click();

        expect(router.navigate).toHaveBeenCalledWith(['/result', 1, 'evidence'], { queryParams: { version: 'v1', from: 'results-center' } });
      });

      it('forwards `from` when it is "home"', () => {
        routeMock().snapshot.queryParamMap.get = (key: string) => (key === 'from' ? 'home' : null);

        findButton('Click here to go there')!.nativeElement.click();

        expect(router.navigate).toHaveBeenCalledWith(['/result', 1, 'evidence'], { queryParams: { from: 'home' } });
      });

      it('drops `from` when it is neither "results-center" nor "home"', () => {
        routeMock().snapshot.queryParamMap.get = (key: string) => (key === 'from' ? 'some-other-source' : null);

        findButton('Click here to go there')!.nativeElement.click();

        expect(router.navigate).toHaveBeenCalledWith(['/result', 1, 'evidence'], { queryParams: {} });
      });

      it('drops `version` from the query params when the current URL has none', () => {
        routeMock().snapshot.queryParamMap.get = () => null;

        findButton('Click here to go there')!.nativeElement.click();

        expect(router.navigate).toHaveBeenCalledWith(['/result', 1, 'evidence'], { queryParams: {} });
      });

      // Falsifying input (KZ-001, recurrence 4): a spy checked only with toHaveBeenCalled() would
      // still pass if goToEvidence() dropped its query params entirely — proved by calling the
      // component method directly with a route that supplies both, and asserting BOTH arguments.
      it('falsifying input: asserting only that navigate was called does NOT discharge c5', () => {
        routeMock().snapshot.queryParamMap.get = (key: string) => (key === 'version' ? 'v9' : key === 'from' ? 'home' : null);

        component.goToEvidence();

        // A weaker assertion (would pass even for a broken implementation that navigates with no params):
        expect(router.navigate).toHaveBeenCalled();
        // The evidence c5 actually requires — both arguments, together:
        expect(router.navigate).toHaveBeenCalledWith(['/result', 1, 'evidence'], { queryParams: { version: 'v9', from: 'home' } });
      });

      // Coordinator correction: `:id` is frequently a platform-coded identifier (e.g. `STAR-13232`),
      // not a bare number. `cache.currentResultId()` carries that string verbatim (`ResultComponent
      // .getCurrentResultIdentifier` preserves it); `cache.getCurrentNumericResultId()` would
      // silently truncate it to its numeric tail (`13232`), producing a different URL form than
      // every other navigation in the app. Every other c5 test uses `'1'`/`1` — a bare numeric — so
      // this is the one case in the suite that would catch a prefix-dropping regression.
      it('forwards a platform-coded id (e.g. STAR-13232) verbatim, never its numeric tail', () => {
        cacheMock.currentResultId.mockReturnValue('STAR-13232');
        routeMock().snapshot.queryParamMap.get = (key: string) => (key === 'version' ? 'v2' : null);

        findButton('Click here to go there')!.nativeElement.click();

        expect(router.navigate).toHaveBeenCalledWith(['/result', 'STAR-13232', 'evidence'], { queryParams: { version: 'v2' } });
      });
    });

    // -----------------------------------------------------------------------------------------------
    // c6 — guidance, definitions link and evidence callout all render at level null/0/9 and with
    // isEditableStatus() false (R-IUP-020 AC.5, R-IUP-021 AC.5)
    // -----------------------------------------------------------------------------------------------
    describe('c6 — unconditional rendering', () => {
      const assertAllThreeRender = () => {
        expect(fixture.debugElement.query(By.css('[data-testid="use-level-guidance"]'))).toBeTruthy();
        expect(fixture.debugElement.query(By.css('[data-testid="use-level-definitions-link"]'))).toBeTruthy();
        expect(fixture.debugElement.query(By.css('[data-testid="evidence-callout"]'))).toBeTruthy();
        expect(findLink(CALCULATOR_URL)).toBeTruthy();
        expect(findLink(DEFINITIONS_URL)).toBeTruthy();
        expect(findButton('Click here to go there')).toBeTruthy();
      };

      it('renders all three blocks with no level selected (null)', () => {
        component.body.set({ ...component.body(), innovation_use_level_id: undefined });
        fixture.detectChanges();
        assertAllThreeRender();
      });

      it('renders all three blocks at level 0', () => {
        component.body.set({ ...component.body(), innovation_use_level_id: idForLevel(0) });
        fixture.detectChanges();
        assertAllThreeRender();
      });

      it('renders all three blocks at level 9', () => {
        component.body.set({ ...component.body(), innovation_use_level_id: idForLevel(9) });
        fixture.detectChanges();
        assertAllThreeRender();
      });

      it('renders all three blocks when isEditableStatus() is false', () => {
        submission.isEditableStatus.mockReturnValue(false);
        fixture.detectChanges();
        assertAllThreeRender();
        submission.isEditableStatus.mockReturnValue(true);
      });

      // Falsifying input: wrapping the evidence callout in `@if (showJustification())` must fail
      // this check at level 0, where showJustification() is false and the textarea does not render.
      it('falsifying input: at level 0 the conditional textarea is absent, proving the evidence callout cannot be riding inside that branch', () => {
        component.body.set({ ...component.body(), innovation_use_level_id: idForLevel(0) });
        fixture.detectChanges();

        expect(component.showJustification()).toBe(false);
        expect(fixture.debugElement.query(By.css('textarea'))).toBeNull();
        // Yet the evidence callout is still present — it cannot be a descendant of the branch above.
        expect(fixture.debugElement.query(By.css('[data-testid="evidence-callout"]'))).toBeTruthy();
      });
    });

    // -----------------------------------------------------------------------------------------------
    // c12 — measured (not eyeballed) contrast of the RESOLVED colour against the callout background,
    // for all four text roles (bullets, P1, P2, links). Because jsdom applies no stylesheet, "resolved"
    // here means: (a) the exact utility class the element carries is asserted, one selector at a time,
    // and (b) the WCAG ratio for that token's hex value is computed by a pure function below — the
    // token's OWN cascade trap (`.description` / `.description a` in custom-fields.scss / styles.scss)
    // is proven inapplicable by asserting `.description` is never an ancestor of these elements, so
    // the utility class asserted in (a) is what actually renders (§5.8's traps do not reach here).
    // -----------------------------------------------------------------------------------------------
    describe('c12 — contrast, measured', () => {
      // WCAG 2.1 relative luminance / contrast ratio — pure functions, independent of jsdom style
      // resolution (jsdom does not paint; see "What this task's automated criteria cannot prove").
      // Takes decimal RGB triples rather than "#rrggbb" strings deliberately (c8's grep bans a `#`
      // followed by 3-8 hex digits ANYWHERE in this file, comments included — DD-7's zero-hex rule
      // is a project-wide grep, not a component-only one, so the WCAG math below is expressed in
      // the same units without ever spelling a literal hex triplet).
      type Rgb = [number, number, number];
      const relativeLuminance = ([r8, g8, b8]: Rgb): number => {
        const channel = (v: number) => (v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4));
        const [r, g, b] = [r8, g8, b8].map(v => channel(v / 255));
        return 0.2126 * r + 0.7152 * g + 0.0722 * b;
      };
      const contrastRatio = (fg: Rgb, bg: Rgb): number => {
        const l1 = relativeLuminance(fg);
        const l2 = relativeLuminance(bg);
        const [lighter, darker] = l1 > l2 ? [l1, l2] : [l2, l1];
        return (lighter + 0.05) / (darker + 0.05);
      };

      // Light-theme token values, transcribed as decimal RGB from src/styles/colors.scss's :root
      // block (verified by reading the file, not assumed) — see the class header comment above for
      // why decimal rather than the hex the stylesheet itself uses.
      const GREY_100: Rgb = [244, 247, 249]; // --ac-grey-100 — the two callouts' background
      const WHITE_1: Rgb = [255, 255, 255]; // --ac-white-1 — the definitions link's paragraph sits on the card, not a callout
      const GREY_800: Rgb = [76, 81, 88]; // --ac-grey-800 — DD-17's body-text token
      const LIGHT_BLUE_400: Rgb = [3, 91, 169]; // --ac-light-blue-400 — DD-17's link token
      const GREY_600: Rgb = [141, 146, 153]; // --ac-grey-600 — the ACTORS callout's (wrong-for-here) token

      it('resolves the cascade: none of the four text roles sits inside a `.description` ancestor', () => {
        // `.description` (custom-fields.scss, rgb(119,124,131), 3.91:1) and `.description a`
        // (styles.scss, rgb(46,46,46)) only match elements that are, or descend from,
        // `class="description"`. The new blocks never carry that class, so the winning colour for
        // every role below is the explicit `text-[var(--ac-*)]` utility class asserted next — not
        // the trap.
        const guidanceBullets = fixture.debugElement.queryAll(By.css('[data-testid="use-level-guidance"] li'));
        const evidenceParagraphs = fixture.debugElement.queryAll(By.css('[data-testid="evidence-callout"] p'));
        const allNewLinks = [findLink(CALCULATOR_URL), findLink(DEFINITIONS_URL)];
        const evidenceButton = findButton('Click here to go there');

        [...guidanceBullets, ...evidenceParagraphs, ...allNewLinks, evidenceButton].forEach(el => {
          expect((el!.nativeElement as HTMLElement).closest('.description')).toBeNull();
        });
      });

      it('which selector won: bullets carry text-[var(--ac-grey-800)], never text-[var(--ac-grey-600)]', () => {
        const bullets = fixture.debugElement.queryAll(By.css('[data-testid="use-level-guidance"] li'));
        bullets.forEach(li => {
          const className = (li.nativeElement as HTMLElement).className;
          expect(className).toContain('text-[var(--ac-grey-800)]');
          expect(className).not.toContain('text-[var(--ac-grey-600)]');
        });
      });

      it('which selector won: P1/P2 carry text-[var(--ac-grey-800)]', () => {
        const paragraphs = fixture.debugElement.queryAll(By.css('[data-testid="evidence-callout"] p'));
        paragraphs.forEach(p => {
          expect((p.nativeElement as HTMLElement).className).toContain('text-[var(--ac-grey-800)]');
        });
      });

      it('which selector won: all three links/buttons carry text-[var(--ac-light-blue-400)]', () => {
        const calculatorLink = findLink(CALCULATOR_URL)!.nativeElement as HTMLElement;
        const definitionsLink = findLink(DEFINITIONS_URL)!.nativeElement as HTMLElement;
        const evidenceButton = findButton('Click here to go there')!.nativeElement as HTMLElement;

        [calculatorLink, definitionsLink, evidenceButton].forEach(el => {
          expect(el.className).toContain('text-[var(--ac-light-blue-400)]');
        });
      });

      it('computes ≥ 4.5:1 for body text and link text against the callout background (--ac-grey-100)', () => {
        const bodyRatio = contrastRatio(GREY_800, GREY_100);
        const linkRatio = contrastRatio(LIGHT_BLUE_400, GREY_100);

        expect(bodyRatio).toBeCloseTo(7.44, 1);
        expect(linkRatio).toBeCloseTo(6.35, 1);
        expect(bodyRatio).toBeGreaterThanOrEqual(4.5);
        expect(linkRatio).toBeGreaterThanOrEqual(4.5);
      });

      it('computes ≥ 4.5:1 for the definitions link paragraph against the card background (--ac-white-1)', () => {
        const bodyRatio = contrastRatio(GREY_800, WHITE_1);
        const linkRatio = contrastRatio(LIGHT_BLUE_400, WHITE_1);

        expect(bodyRatio).toBeGreaterThanOrEqual(4.5);
        expect(linkRatio).toBeGreaterThanOrEqual(4.5);
      });

      // Falsifying input: substituting --ac-grey-600 for the body text must report 2.91:1 and FAIL.
      it('falsifying input: substituting --ac-grey-600 for the body token reports 2.91:1 and fails 4.5:1', () => {
        const wrongRatio = contrastRatio(GREY_600, GREY_100);

        expect(wrongRatio).toBeCloseTo(2.91, 1);
        expect(wrongRatio).toBeLessThan(4.5);
      });
    });
  });

  // =================================================================================================
  // T-11 — Innovation Use call site: DD-5/DD-14 bindings, the read coercion, R-MSD-001/R-MSD-009.
  // KZ-015: every test below arranges the empty -> populated TRANSITION (the outer beforeEach already
  // rendered the empty state via fixture.detectChanges(); each test then adds/sets a row and renders
  // again), matching how this page actually acquires data (async getData()), never a pre-populated
  // fixture created before the first detectChanges().
  // =================================================================================================
  describe('T-11 — R-MSD-012 AC.3: max/min are DERIVED from scale at this call site, not hard-coded (DD-14)', () => {
    it('forwards the scale-4 derived symmetric bound to the real app-input instance', () => {
      component.addQuantification();
      fixture.detectChanges();

      const quantCard = fixture.debugElement.query(By.directive(QuantificationItemComponent));
      const numberInput = quantCard.query(By.directive(InputComponent)).componentInstance as InputComponent;

      // Literal from requirements.md R-MSD-012 AC.2 / design.md §6.2's Leader-verified table — not
      // recomputed here via the same formula under test (that would be tautological).
      expect(numberInput.max).toBe(549_755_813_887);
      expect(numberInput.min).toBe(-549_755_813_887);
      expect(numberInput.maxFractionDigits).toBe(4);
    });
  });

  describe('T-11 — R-MSD-008: the placeholder no longer says "positive" (DD-5, AC.1/AC.2)', () => {
    it('renders a placeholder without the word "positive" on the Number field\'s native input (not asserted on the class property alone)', () => {
      component.addQuantification();
      fixture.detectChanges();

      const quantCard = fixture.debugElement.query(By.directive(QuantificationItemComponent));
      const numberInputDe = quantCard.query(By.directive(InputComponent));
      const nativeInput = numberInputDe.query(By.css('input')).nativeElement as HTMLInputElement;

      expect(nativeInput.placeholder).not.toContain('positive');
      expect(nativeInput.placeholder.length).toBeGreaterThan(0);
    });
  });

  describe('T-11 — R-MSD-001 :181/:182 — a negative fraction survives entry; 0 is a value, not empty', () => {
    it('the real p-inputNumber instance neither rounds nor clamps -12.75 to 0, and does not drop the sign', () => {
      component.addQuantification();
      fixture.detectChanges();

      const quantCard = fixture.debugElement.query(By.directive(QuantificationItemComponent));
      const inputNumberInstance = quantCard.query(By.directive(InputNumber)).componentInstance as InputNumber;

      // formatValue() is PrimeNG's own rendering method (T-10 precedent) — this measures what the
      // derived bound + maxFractionDigits:4 actually do to a signed fraction, not the class field
      // that holds them (KZ-001).
      expect(inputNumberInstance.formatValue(-12.75)).toBe('-12.75');
      expect(inputNumberInstance.formatValue(-12.75)).not.toBe('0');
      expect(inputNumberInstance.formatValue(-12.75)).not.toBe('-13');
    });

    it('0 is rendered as "0", never as an empty string', () => {
      component.addQuantification();
      fixture.detectChanges();

      const quantCard = fixture.debugElement.query(By.directive(QuantificationItemComponent));
      const inputNumberInstance = quantCard.query(By.directive(InputNumber)).componentInstance as InputNumber;

      expect(inputNumberInstance.formatValue(0)).toBe('0');
    });

    it('the read adapter treats 0 as a value (never absent) and keeps null/undefined as null (DD-2)', () => {
      component.body.set({
        ...component.body(),
        quantifications: [
          { id: 1, quantification_number: 0, unit: 'kg', description: '' },
          { id: 2, quantification_number: null as unknown as undefined, unit: '', description: '' },
          { id: 3, quantification_number: undefined, unit: '', description: '' }
        ]
      });

      const view = component.quantificationsView();
      expect(view[0].number).toBe(0);
      expect(view[1].number).toBeNull();
      expect(view[2].number).toBeNull();
    });
  });

  describe('T-11 — R-MSD-001 :189/:190 — the spinner does not reintroduce the floor', () => {
    it('does not bind [step] — PrimeNG\'s own default of 1 (whole-unit stepping) applies', () => {
      component.addQuantification();
      fixture.detectChanges();

      const quantCard = fixture.debugElement.query(By.directive(QuantificationItemComponent));
      const inputNumberInstance = quantCard.query(By.directive(InputNumber)).componentInstance as InputNumber;

      expect(inputNumberInstance.step).toBe(1);
    });

    it('decrementing from 0 goes below zero — min is negative here, so PrimeNG\'s validateValue() does not clamp at 0', () => {
      component.addQuantification();
      fixture.detectChanges();

      const quantCard = fixture.debugElement.query(By.directive(QuantificationItemComponent));
      const inputNumberInstance = quantCard.query(By.directive(InputNumber)).componentInstance as InputNumber;

      inputNumberInstance.input!.nativeElement.value = '0';
      // spin() is PrimeNG's own decrement mechanism, called by the down-button's mousedown handler
      // (onDownButtonMouseDown -> repeat -> spin) — called directly here rather than via a simulated
      // DOM mousedown (see this task's completion report for what that does and does not close).
      inputNumberInstance.spin({} as Event, -1);

      expect(inputNumberInstance.value).toBe(-1);
    });
  });

  // R-MSD-009 :430/:431 — DC-6 (string-on-wire render defect). Asserted at TWO seams, because they
  // are sensitive to DIFFERENT things: `quantificationsView()` directly is the DD-3 adapter itself
  // (removing its coercion's string branch reddens ONLY this seam's string case — measured: PrimeNG's
  // own `p-inputNumber.writeValue()` ALSO runs `Number(value)` on write, so the RENDERED-DOM seam
  // below stays green even with the adapter's coercion removed — it is not load-bearing for THAT
  // seam alone. Both seams are kept: the adapter-level test is what the mandated falsifier reddens;
  // the rendered-DOM test is what R-MSD-009's AC actually reads ("renders exactly").
  describe('T-11 — R-MSD-009 :430/:431 — the DD-3 adapter itself, string vs. number wire type', () => {
    it('wire type NUMBER (-0.75): quantificationsView() returns the number -0.75 unchanged', () => {
      component.body.set({
        ...component.body(),
        quantifications: [{ id: 1, quantification_number: -0.75, unit: 'kg', description: '' }]
      });

      const view = component.quantificationsView();
      expect(view[0].number).toBe(-0.75);
      expect(typeof view[0].number).toBe('number');
    });

    it('wire type STRING ("-0.7500"): quantificationsView() coerces to the number -0.75, not the literal string', () => {
      component.body.set({
        ...component.body(),
        quantifications: [{ id: 1, quantification_number: '-0.7500' as unknown as number, unit: 'kg', description: '' }]
      });

      const view = component.quantificationsView();
      expect(view[0].number).toBe(-0.75);
      expect(typeof view[0].number).toBe('number'); // NOT the string "-0.7500" the falsifier leaves behind
    });
  });

  // Same claim, at the RENDERED-DOM seam R-MSD-009's AC actually names ("the field renders -0.75").
  describe('T-11 — R-MSD-009 :430/:431 — a wire value of "-0.7500" (string) renders identically to -0.75 (number)', () => {
    it('wire type NUMBER (-0.75): renders "-0.75"', async () => {
      component.body.set({
        ...component.body(),
        quantifications: [{ id: 1, quantification_number: -0.75, unit: 'kg', description: '' }]
      });
      fixture.detectChanges();
      // app-input's own onChange effect (which copies the card's signal into its rendered value)
      // is scheduled, not synchronous with detectChanges() — flush it before reading the DOM.
      await fixture.whenStable();
      fixture.detectChanges();

      const quantCard = fixture.debugElement.query(By.directive(QuantificationItemComponent));
      const nativeInput = quantCard.query(By.directive(InputComponent)).query(By.css('input')).nativeElement as HTMLInputElement;

      expect(nativeInput.value).toBe('-0.75');
    });

    it('wire type STRING ("-0.7500"): renders "-0.75" — not "-0.7500", NaN, "0", or empty', async () => {
      component.body.set({
        ...component.body(),
        quantifications: [{ id: 1, quantification_number: '-0.7500' as unknown as number, unit: 'kg', description: '' }]
      });
      fixture.detectChanges();
      await fixture.whenStable();
      fixture.detectChanges();

      const quantCard = fixture.debugElement.query(By.directive(QuantificationItemComponent));
      const nativeInput = quantCard.query(By.directive(InputComponent)).query(By.css('input')).nativeElement as HTMLInputElement;

      expect(nativeInput.value).toBe('-0.75');
      expect(nativeInput.value).not.toBe('-0.7500');
      expect(nativeInput.value).not.toBe('NaN');
      expect(nativeInput.value).not.toBe('0');
      expect(nativeInput.value).not.toBe('');
    });
  });
});

// ===================================================================================================
// R3 (validation-report.md remediation) — extends T-14 c12's pure-function WCAG contrast instrument
// from the four Amendment-01 text roles it originally covered to every text role in the section
// (R-IUP-017 AC.3 / F-1: "the instrument existed and was aimed at a quarter of the surface"). Same
// method as c12 above — decimal RGB triples, no hex literal anywhere in this file (DD-7's zero-hex
// rule is a project-wide grep, not a component-only one) — duplicated locally rather than reached
// across describe blocks, so this block runs standalone. As with c12: jsdom applies no stylesheet
// and Tailwind is a runtime browser CDN script (src/index.html) invisible to jsdom, so no test here
// proves a RENDERED colour — each `it` asserts (a) which utility class won the element (the losing,
// pre-fix class is asserted absent) and (b) that token's own WCAG arithmetic, which is the strongest
// claim available at this tier.
// ===================================================================================================
describe('InnovationUseDetailsComponent — R3: contrast, measured, extended to every text role (validation-report.md R1/R3)', () => {
  let fixture: ComponentFixture<InnovationUseDetailsComponent>;
  let component: InnovationUseDetailsComponent;

  type Rgb = [number, number, number];
  const relativeLuminance = ([r8, g8, b8]: Rgb): number => {
    const channel = (v: number) => (v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4));
    const [r, g, b] = [r8, g8, b8].map(v => channel(v / 255));
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };
  const contrastRatio = (fg: Rgb, bg: Rgb): number => {
    const l1 = relativeLuminance(fg);
    const l2 = relativeLuminance(bg);
    const [lighter, darker] = l1 > l2 ? [l1, l2] : [l2, l1];
    return (lighter + 0.05) / (darker + 0.05);
  };

  // Light-theme token values, transcribed as decimal RGB from src/styles/colors.scss's :root block
  // (verified by reading the file, not assumed). GREY_600 / GREY_700 / LIGHT_BLUE_300 are the
  // *superseded* tokens — kept only to drive the falsifying-input tests below.
  const GREY_100: Rgb = [244, 247, 249]; // --ac-grey-100
  const GREY_200: Rgb = [232, 235, 237]; // --ac-grey-200
  const WHITE_1: Rgb = [255, 255, 255]; // --ac-white-1
  const GREY_800: Rgb = [76, 81, 88]; // --ac-grey-800 — DD-17's body/eyebrow token
  const GREY_600: Rgb = [141, 146, 153]; // --ac-grey-600 — superseded (ACTORS/eyebrow pre-fix)
  const GREY_700: Rgb = [119, 124, 131]; // --ac-grey-700 — superseded (organization-callout pre-fix)
  const LIGHT_BLUE_300: Rgb = [22, 137, 202]; // --ac-light-blue-300 — superseded (Add-button/stepper/org-link pre-fix)
  const LIGHT_BLUE_400: Rgb = [3, 91, 169]; // --ac-light-blue-400 — DD-17's link/Add/stepper token
  const LIGHT_BLUE_500: Rgb = [7, 75, 134]; // --ac-light-blue-500 — the grey-200-surface token

  beforeEach(async () => {
    jest.clearAllMocks();
    submission.isEditableStatus.mockReturnValue(true);
    apiService.GET_InnovationUseDetails.mockResolvedValue({
      data: {
        innovation_use_level_id: idForLevel(3),
        innovation_use_level_explanation: 'evidence',
        actors: [new InnovationUseActor()],
        organizations: [{ ...new InnovationUseOrganization(), is_organization_known: true }],
        quantifications: []
      },
      successfulRequest: true
    });
    apiService.GET_InnovationUseLevels.mockResolvedValue({ data: LEVELS_FIXTURE, successfulRequest: true });

    await TestBed.configureTestingModule({
      imports: [InnovationUseDetailsComponent, HttpClientTestingModule],
      providers: [
        { provide: ApiService, useValue: apiService },
        { provide: CacheService, useClass: CacheServiceMock },
        { provide: ActionsService, useValue: actions },
        { provide: Router, useValue: router },
        { provide: SubmissionService, useValue: submission },
        { provide: VersionWatcherService, useValue: versionWatcher },
        { provide: ActivatedRoute, useValue: activatedRouteMock }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(InnovationUseDetailsComponent);
    component = fixture.componentInstance;
    await component.getData();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  });

  it('loadFailed banner: text-[var(--ac-grey-800)] on --ac-grey-100 (>= 4.5:1)', () => {
    component.loadFailed.set(true);
    fixture.detectChanges();

    const banner = fixture.debugElement
      .queryAll(By.css('span'))
      .find(s => (s.nativeElement as HTMLElement).textContent?.includes('could not be loaded'));
    expect(banner).toBeTruthy();
    expect((banner!.nativeElement as HTMLElement).className).toContain('text-[var(--ac-grey-800)]');
    expect((banner!.nativeElement as HTMLElement).className).not.toContain('text-[var(--ac-grey-700)]');

    const ratio = contrastRatio(GREY_800, GREY_100);
    expect(ratio).toBeCloseTo(7.44, 1);
    expect(ratio).toBeGreaterThanOrEqual(4.5);

    component.loadFailed.set(false);
  });

  it('ACTORS callout body: text-[var(--ac-grey-800)] on --ac-grey-100 (>= 4.5:1)', () => {
    const body = fixture.debugElement
      .queryAll(By.css('span'))
      .find(s => (s.nativeElement as HTMLElement).textContent?.trim() === 'List every actor group using this innovation.');
    expect(body).toBeTruthy();
    expect((body!.nativeElement as HTMLElement).className).toContain('text-[var(--ac-grey-800)]');
    expect((body!.nativeElement as HTMLElement).className).not.toContain('text-[var(--ac-grey-600)]');

    const ratio = contrastRatio(GREY_800, GREY_100);
    expect(ratio).toBeGreaterThanOrEqual(4.5);
  });

  it('Add-other buttons (actor/organization/measure): text-[var(--ac-light-blue-400)] on --ac-white-1 (>= 4.5:1)', () => {
    ['Add other actor', 'Add other organization', 'Add other measure'].forEach(label => {
      const btn = fixture.debugElement.queryAll(By.css('button')).find(b => (b.nativeElement as HTMLElement).textContent?.includes(label));
      expect(btn).toBeTruthy();
      expect((btn!.nativeElement as HTMLElement).className).toContain('text-[var(--ac-light-blue-400)]');
      expect((btn!.nativeElement as HTMLElement).className).not.toContain('text-[var(--ac-light-blue-300)]');
    });

    const ratio = contrastRatio(LIGHT_BLUE_400, WHITE_1);
    expect(ratio).toBeCloseTo(6.83, 1);
    expect(ratio).toBeGreaterThanOrEqual(4.5);
  });

  it('actor card eyebrow "ACTOR # n": text-[var(--ac-grey-800)] on --ac-grey-100 (>= 4.5:1)', () => {
    const eyebrow = fixture.debugElement
      .queryAll(By.css('app-innovation-use-actor-item span'))
      .find(s => (s.nativeElement as HTMLElement).textContent?.includes('ACTOR #'));
    expect(eyebrow).toBeTruthy();
    expect((eyebrow!.nativeElement as HTMLElement).className).toContain('text-[var(--ac-grey-800)]');
    expect((eyebrow!.nativeElement as HTMLElement).className).not.toContain('text-[var(--ac-grey-600)]');

    const ratio = contrastRatio(GREY_800, GREY_100);
    expect(ratio).toBeGreaterThanOrEqual(4.5);
  });

  it('organization card eyebrow "ORGANIZATION # n": text-[var(--ac-grey-800)] on --ac-grey-100 (>= 4.5:1)', () => {
    const eyebrow = fixture.debugElement
      .queryAll(By.css('app-innovation-use-organization-item span'))
      .find(s => (s.nativeElement as HTMLElement).textContent?.includes('ORGANIZATION #'));
    expect(eyebrow).toBeTruthy();
    expect((eyebrow!.nativeElement as HTMLElement).className).toContain('text-[var(--ac-grey-800)]');
    expect((eyebrow!.nativeElement as HTMLElement).className).not.toContain('text-[var(--ac-grey-600)]');

    const ratio = contrastRatio(GREY_800, GREY_100);
    expect(ratio).toBeGreaterThanOrEqual(4.5);
  });

  it('organization known-institution callout body: text-[var(--ac-grey-800)] on --ac-grey-200 (>= 4.5:1)', () => {
    const orgItem = fixture.debugElement.query(By.css('app-innovation-use-organization-item'));
    const calloutBody = orgItem
      .queryAll(By.css('span'))
      .find(s => (s.nativeElement as HTMLElement).textContent?.includes("Can't find the institution"));
    expect(calloutBody).toBeTruthy();
    expect((calloutBody!.nativeElement as HTMLElement).className).toContain('text-[var(--ac-grey-800)]');
    expect((calloutBody!.nativeElement as HTMLElement).className).not.toContain('text-[var(--ac-grey-700)]');

    const ratio = contrastRatio(GREY_800, GREY_200);
    expect(ratio).toBeCloseTo(6.68, 1);
    expect(ratio).toBeGreaterThanOrEqual(4.5);
  });

  it('organization known-institution callout link "here": text-[var(--ac-light-blue-500)] on --ac-grey-200 (>= 4.5:1)', () => {
    const orgItem = fixture.debugElement.query(By.css('app-innovation-use-organization-item'));
    const hereButton = orgItem.queryAll(By.css('button')).find(b => (b.nativeElement as HTMLElement).textContent?.trim() === 'here');
    expect(hereButton).toBeTruthy();
    expect((hereButton!.nativeElement as HTMLElement).className).toContain('text-[var(--ac-light-blue-500)]');
    expect((hereButton!.nativeElement as HTMLElement).className).not.toContain('text-[var(--ac-light-blue-300)]');

    const ratio = contrastRatio(LIGHT_BLUE_500, GREY_200);
    expect(ratio).toBeCloseTo(7.43, 1);
    expect(ratio).toBeGreaterThanOrEqual(4.5);
  });

  it('actor card "Total" value: text-[var(--ac-grey-800)] on --ac-grey-100 (>= 4.5:1, already conformant before R1)', () => {
    const total = fixture.debugElement.query(By.css('span.actor-total'));
    expect(total).toBeTruthy();
    expect((total!.nativeElement as HTMLElement).className).toContain('text-[var(--ac-grey-800)]');

    const ratio = contrastRatio(GREY_800, GREY_100);
    expect(ratio).toBeGreaterThanOrEqual(4.5);
  });

  it('stepper unselected digits: text-[var(--ac-light-blue-400)] on --ac-white-1 (>= 4.5:1)', () => {
    const buttons = fixture.debugElement.queryAll(By.css('app-innovation-use-level-stepper button'));
    const unselected = buttons.filter(b => !(b.nativeElement as HTMLElement).className.includes('bg-[var(--ac-light-blue-400)]'));
    expect(unselected.length).toBeGreaterThan(0);
    unselected.forEach(b => {
      expect((b.nativeElement as HTMLElement).className).toContain('text-[var(--ac-light-blue-400)]');
      expect((b.nativeElement as HTMLElement).className).not.toContain('text-[var(--ac-light-blue-300)]');
    });

    const ratio = contrastRatio(LIGHT_BLUE_400, WHITE_1);
    expect(ratio).toBeGreaterThanOrEqual(4.5);
  });

  it('stepper selected digit fill: text-[var(--ac-white-1)] on the re-derived --ac-light-blue-400 fill (>= 4.5:1)', () => {
    const buttons = fixture.debugElement.queryAll(By.css('app-innovation-use-level-stepper button'));
    const selected = buttons.filter(b => (b.nativeElement as HTMLElement).className.includes('bg-[var(--ac-light-blue-400)]'));
    expect(selected.length).toBe(1);
    expect((selected[0].nativeElement as HTMLElement).className).toContain('text-[var(--ac-white-1)]');
    expect((selected[0].nativeElement as HTMLElement).className).not.toContain('bg-[var(--ac-light-blue-300)]');

    const ratio = contrastRatio(WHITE_1, LIGHT_BLUE_400);
    expect(ratio).toBeCloseTo(6.83, 1);
    expect(ratio).toBeGreaterThanOrEqual(4.5);
  });

  // Falsifying inputs (KZ-014) — each superseded token must still measurably fail 4.5:1, proving the
  // assertions above are discriminating rather than vacuously true. K-004/KZ-014: this is the "red"
  // this block must be able to show — see the reverted-swap check run separately during verification.
  it('falsifying input: --ac-grey-600 on --ac-grey-100 (ACTORS/eyebrow pre-fix token) reports 2.91:1 and fails', () => {
    const ratio = contrastRatio(GREY_600, GREY_100);
    expect(ratio).toBeCloseTo(2.91, 1);
    expect(ratio).toBeLessThan(4.5);
  });

  it('falsifying input: --ac-grey-700 on --ac-grey-200 (organization-callout pre-fix token) reports 3.51:1 and fails', () => {
    const ratio = contrastRatio(GREY_700, GREY_200);
    expect(ratio).toBeCloseTo(3.51, 1);
    expect(ratio).toBeLessThan(4.5);
  });

  it('falsifying input: --ac-light-blue-300 on --ac-white-1 (Add-button/stepper pre-fix token) reports 3.84:1 and fails', () => {
    const ratio = contrastRatio(LIGHT_BLUE_300, WHITE_1);
    expect(ratio).toBeCloseTo(3.84, 1);
    expect(ratio).toBeLessThan(4.5);
  });

  it('falsifying input: --ac-light-blue-300 on --ac-grey-200 (organization-callout link pre-fix token) reports 3.21:1 and fails', () => {
    const ratio = contrastRatio(LIGHT_BLUE_300, GREY_200);
    expect(ratio).toBeCloseTo(3.21, 1);
    expect(ratio).toBeLessThan(4.5);
  });
});

// ===================================================================================================
// c11 — `Add other actor` issues no HTTP request. Uses the REAL ApiService (backed by
// HttpClientTestingModule) rather than a mocked one, so the assertion is on HttpTestingController
// itself (the disqualifier requires this — a mocked-ApiService "not called" check is not the same
// evidence).
// ===================================================================================================
describe('InnovationUseDetailsComponent — c11 (real HTTP layer)', () => {
  let fixture: ComponentFixture<InnovationUseDetailsComponent>;
  let component: InnovationUseDetailsComponent;
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InnovationUseDetailsComponent, HttpClientTestingModule],
      providers: [
        { provide: CacheService, useClass: CacheServiceMock },
        { provide: ActionsService, useValue: actions },
        { provide: SubmissionService, useValue: submission },
        { provide: Router, useValue: router },
        { provide: ActivatedRoute, useValue: activatedRouteMock },
        { provide: VersionWatcherService, useValue: versionWatcher }
        // ApiService intentionally NOT overridden: real ApiService -> real HttpClient -> intercepted
        // by HttpClientTestingModule, so every request is observable on HttpTestingController.
      ]
    }).compileComponents();

    httpMock = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(InnovationUseDetailsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('issues no HTTP request when addActor() is called', async () => {
    // getData() is called without awaiting yet: the HTTP GET it issues is dispatched
    // synchronously (ToPromiseService subscribes immediately), but the returned promise only
    // resolves once the request is flushed below — awaiting it first would deadlock.
    const getDataPromise = component.getData();

    // Flush the two GETs issued at construction (the levels catalog service's own root-provided
    // constructor) and by this call to getData() — versionWatcher is mocked here, so getData()
    // must be called explicitly rather than relying on a real onVersionChange effect.
    const levelsReq = httpMock.expectOne(req => req.url.includes('innovation-use-levels'));
    levelsReq.flush({ data: [], status: 200, description: '', timestamp: '', path: '' });

    const detailsReq = httpMock.expectOne(req => req.url.includes('innovation-use/1'));
    detailsReq.flush({ data: new GetInnovationUseDetails(), status: 200, description: '', timestamp: '', path: '' });

    await getDataPromise;
    await fixture.whenStable();

    // `GET_InnovationUseDetails` carries `loadingTrigger: true`, so the real ToPromiseService's
    // `finalize()` also fires a `results/green-checks/1` GET as a side effect of the load itself
    // (§6.1: "Green checks refresh as a side effect of step 1's loadingTrigger: true") — not of
    // `addActor()`. Flush it here so it is not mistaken for a request `addActor()` issued.
    const greenChecksReq = httpMock.expectOne(req => req.url.includes('green-checks'));
    greenChecksReq.flush({ data: {}, status: 200, description: '', timestamp: '', path: '' });
    await fixture.whenStable();

    component.addActor();

    httpMock.expectNone(() => true);
  });
});

// =================================================================================================
// Bug fix (T-13 human gate) — `goToEvidence()`'s id source, reproduced against the REAL route tree.
//
// The `activatedRouteMock` used everywhere above is flat: `paramMap.get('id')` always answers '1',
// regardless of where in the tree the component sits. That is exactly why the shipped defect (T-14,
// e508eeea) passed a green c5 suite — the mock does not evaluate what it stands in for (KZ-001).
//
// In production, `result/:id` (app.routes.ts) is the PARENT route; `innovation-use-details` is a
// CHILD of it (app.routes.ts, `innovation-use-details` under `result/:id`'s `children`). Angular's
// router defaults `paramsInheritanceStrategy` to `'emptyOnly'` (app.config.ts's `provideRouter(...)`
// never overrides it) — a child route's own `ActivatedRoute.snapshot.paramMap` does NOT inherit the
// parent's `:id`. `ResultSidebarComponent.navigateTo()` (result.component.html) sits AT `result/:id`,
// not below it, which is why its identical-looking `route.snapshot.paramMap.get('id')` line works
// while this component's copy of that line does not — same code, different tree depth.
//
// This block models that real tree with `provideRouter` + `RouterTestingHarness` (never a hand-made
// route double) so the assertions below are faithful to what production actually resolves.
// =================================================================================================
@Component({ selector: 'app-result-route-stub', standalone: true, imports: [RouterOutlet], template: '<router-outlet></router-outlet>' })
class ResultRouteStubComponent {}

describe('InnovationUseDetailsComponent — goToEvidence() id source (faithful result/:id -> innovation-use-details route tree)', () => {
  const routeTreeApiService = {
    GET_InnovationUseDetails: jest.fn().mockResolvedValue({ data: new GetInnovationUseDetails(), successfulRequest: true }),
    PATCH_InnovationUseDetails: jest.fn().mockResolvedValue({ data: new GetInnovationUseDetails(), successfulRequest: true }),
    GET_InnovationUseLevels: jest.fn().mockResolvedValue({ data: [], successfulRequest: true }),
    GET_ActorTypes: jest.fn().mockResolvedValue({ data: [], successfulRequest: true }),
    GET_Institutions: jest.fn().mockResolvedValue({ data: [], successfulRequest: true }),
    GET_InstitutionTypes: jest.fn().mockResolvedValue({ data: [], successfulRequest: true }),
    GET_SubInstitutionTypes: jest.fn().mockResolvedValue({ data: [], successfulRequest: true })
  };
  const routeTreeActions = { showToast: jest.fn(), saveCurrentSection: jest.fn() };
  const routeTreeSubmission = { isEditableStatus: jest.fn().mockReturnValue(true) };
  const routeTreeVersionWatcher = { onVersionChange: jest.fn() };

  let routeTreeCache: CacheServiceMock;
  let router: Router;
  let navigateSpy: jest.SpyInstance;

  /** Navigates the REAL router to `url` and returns the live, routed InnovationUseDetailsComponent
   *  instance — activated as a child of `ResultRouteStubComponent`, which owns the `<router-outlet>`
   *  that renders it, exactly like `result.component.html` does in production. */
  async function activateInnovationUseDetails(url: string): Promise<InnovationUseDetailsComponent> {
    await TestBed.configureTestingModule({
      providers: [
        provideRouter([
          {
            path: 'result/:id',
            component: ResultRouteStubComponent,
            children: [{ path: 'innovation-use-details', component: InnovationUseDetailsComponent }]
          }
        ]),
        { provide: ApiService, useValue: routeTreeApiService },
        { provide: CacheService, useClass: CacheServiceMock },
        { provide: ActionsService, useValue: routeTreeActions },
        { provide: SubmissionService, useValue: routeTreeSubmission },
        { provide: VersionWatcherService, useValue: routeTreeVersionWatcher }
      ]
    }).compileComponents();

    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl(url, ResultRouteStubComponent);
    router = TestBed.inject(Router);
    routeTreeCache = TestBed.inject(CacheService) as unknown as CacheServiceMock;
    harness.fixture.detectChanges();
    await harness.fixture.whenStable();

    const routed = harness.fixture.debugElement.query(By.directive(InnovationUseDetailsComponent));
    expect(routed).toBeTruthy();
    return routed.componentInstance as InnovationUseDetailsComponent;
  }

  afterEach(() => jest.restoreAllMocks());

  it('structural proof: at this tree depth, paramMap carries no id (emptyOnly is the default, unconfigured in app.config.ts)', async () => {
    const component = await activateInnovationUseDetails('/result/STAR-13232/innovation-use-details?version=v9&from=results-center');

    expect(component.route.snapshot.paramMap.get('id')).toBeNull();
    // Counterpart: queryParamMap is global to the URL, unaffected by paramsInheritanceStrategy.
    expect(component.route.snapshot.queryParamMap.get('version')).toBe('v9');
    expect(component.route.snapshot.queryParamMap.get('from')).toBe('results-center');
  });

  it('navigates with the platform-coded id verbatim (STAR-13232), sourced from CacheService, not the route param', async () => {
    const component = await activateInnovationUseDetails('/result/STAR-13232/innovation-use-details?version=v9&from=results-center');
    routeTreeCache.currentResultId.mockReturnValue('STAR-13232');
    navigateSpy = jest.spyOn(router, 'navigate').mockResolvedValue(true);

    component.goToEvidence();

    expect(navigateSpy).toHaveBeenCalledWith(['/result', 'STAR-13232', 'evidence'], { queryParams: { version: 'v9', from: 'results-center' } });
  });

  it('navigates with a bare numeric id (1), sourced from CacheService', async () => {
    const component = await activateInnovationUseDetails('/result/1/innovation-use-details?version=v1');
    routeTreeCache.currentResultId.mockReturnValue(1);
    navigateSpy = jest.spyOn(router, 'navigate').mockResolvedValue(true);

    component.goToEvidence();

    expect(navigateSpy).toHaveBeenCalledWith(['/result', 1, 'evidence'], { queryParams: { version: 'v1' } });
  });
});
