// @akili-spec docs/specs/innovation-use/details-page (T-07 — innovation use details page shell)
import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { ActivatedRoute, Router } from '@angular/router';
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
    paramMap: { get: (key: string) => (key === 'id' ? '1' : null) },
    queryParamMap: { get: (key: string) => (key === 'version' ? 'v1' : null) }
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
      const textareaEl = fixture.debugElement.query(By.directive(TextareaComponent));
      expect(textareaEl).not.toBeNull();
      expect(textareaEl.nativeElement.textContent).toContain('Justification');
      expect(textareaEl.nativeElement.textContent).toContain('This field is required');
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

  describe('T-09 c5 — resolved level >= 6 with a blank justification blocks save and renders the required message', () => {
    it('renders the required message and issues zero PATCH requests while blank at level >= 6', async () => {
      component.body.set({ ...component.body(), innovation_use_level_id: idForLevel(6), innovation_use_level_explanation: undefined });
      fixture.detectChanges();

      expect(component.justificationMissing()).toBe(true);
      expect(fixture.nativeElement.textContent).toContain('This field is required');

      await component.saveData();
      expect(apiService.PATCH_InnovationUseDetails).not.toHaveBeenCalled();
    });

    // REWORK (Reviewer FAIL, attempt 1): whitespace-only is the exact defect that shipped — the
    // guard (trimmed) and the visible message (untrimmed, on `app-textarea` alone) disagreed.
    // This test asserts the page's OWN required-message block renders — the fix's actual
    // evidence — plus zero PATCH, so it can no longer pass on a build that blocks silently.
    it('renders the page-owned required message and issues zero PATCH requests while the justification is only whitespace at level >= 6', async () => {
      component.body.set({ ...component.body(), innovation_use_level_id: idForLevel(6), innovation_use_level_explanation: '   ' });
      fixture.detectChanges();

      expect(component.justificationMissing()).toBe(true);
      // Falsifying check (Reviewer FAIL): `app-textarea`'s own built-in message does NOT cover
      // this case — its `isInvalid()` is untrimmed length-based and sees a non-empty string, so
      // it renders nothing. If this assertion is satisfied only by that mechanism, it would fail
      // for whitespace; asserting on the page's rendered text proves the page's own block fired.
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
      expect(apiService.PATCH_InnovationUseDetails).not.toHaveBeenCalled();
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
