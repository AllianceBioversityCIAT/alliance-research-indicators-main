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
  // c14 — Back/Next preserve ?version=N
  // ---------------------------------------------------------------------------------------------
  describe('c14 — Back/Next navigation', () => {
    it('navigates back to alliance-alignment preserving the version query param', () => {
      component.navigate('back');
      expect(router.navigate).toHaveBeenCalledWith(['result', 1, 'alliance-alignment'], { queryParams: { version: 'v1' }, replaceUrl: true });
    });

    it('navigates next to partners preserving the version query param', () => {
      component.navigate('next');
      expect(router.navigate).toHaveBeenCalledWith(['result', 1, 'partners'], { queryParams: { version: 'v1' }, replaceUrl: true });
    });

    it('navigates with no query params when version is absent', () => {
      const routeMock = TestBed.inject(ActivatedRoute) as unknown as typeof activatedRouteMock;
      const original = routeMock.snapshot.queryParamMap.get;
      routeMock.snapshot.queryParamMap.get = () => null;

      component.navigate('next');

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
