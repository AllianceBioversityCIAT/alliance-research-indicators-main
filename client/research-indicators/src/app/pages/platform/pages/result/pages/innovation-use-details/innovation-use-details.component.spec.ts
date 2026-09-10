// @akili-spec docs/specs/innovation-use/details-page (T-07 — innovation use details page shell)
import { Tooltip } from 'primeng/tooltip';
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
import { SelectComponent } from '@shared/components/custom-fields/select/select.component';
import { GetInnoDevOutputService } from '@shared/services/control-list/get-innovation-dev-output.service';
import { formatInnovationDevLabel } from './innovation-use-details.component';
import { InnovationUseLevelStepperComponent } from './components/innovation-use-level-stepper/innovation-use-level-stepper.component';

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
  ),
  GET_Results: jest.fn().mockResolvedValue({ data: { results: [] }, successfulRequest: true })
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
      // R-IUR-002/DD-7: the default empty 200 no longer seeds a blank actor row, so this test
      // (which targets the actor card's own skeleton, not the empty-state behaviour c2 owns)
      // must arrange a result that actually has an actor row to render skeletons inside.
      apiService.GET_InnovationUseDetails.mockResolvedValue({
        data: { ...new GetInnovationUseDetails(), actors: [new InnovationUseActor()] },
        successfulRequest: true
      });

      await component.getData();
      cacheMock.currentResultIsLoading.set(true);
      fixture.detectChanges();

      const skeletons = fixture.debugElement.queryAll(By.css('p-skeleton'));
      expect(skeletons.length).toBeGreaterThan(0);
    });

    it('renders no skeleton when currentResultIsLoading() is false', async () => {
      // Hygiene (T-12 pointer 3): give this test the same one-actor arrangement as its sibling
      // above, so a field component actually renders here — without it, the default empty load
      // renders zero field components and the assertion holds regardless of the flag.
      apiService.GET_InnovationUseDetails.mockResolvedValue({
        data: { ...new GetInnovationUseDetails(), actors: [new InnovationUseActor()] },
        successfulRequest: true
      });

      await component.getData();
      cacheMock.currentResultIsLoading.set(false);
      fixture.detectChanges();

      const skeletons = fixture.debugElement.queryAll(By.css('p-skeleton'));
      expect(skeletons.length).toBe(0);
    });
  });

  // ---------------------------------------------------------------------------------------------
  // c2 — empty state (R-IUR-002/DD-7 reversion): zero actor cards on an all-empty 200 — no
  // auto-seeded blank row — plus zero organization/quant cards. Positive assertion per the
  // Disqualifier: buildPayload() filters the array regardless, so a green suite after deleting
  // the seed line proves only that the line was unused, not that the empty state renders
  // correctly. Assert the rendered DOM directly: zero actor cards, the guidance callout still
  // present, and the `Add other actor` button still present (isEditableStatus() true by default).
  // ---------------------------------------------------------------------------------------------
  describe('c2 — empty state', () => {
    it('renders zero Actor/Organization/Quantification cards for an all-empty 200, with the guidance callout and Add other actor button still present', async () => {
      apiService.GET_InnovationUseDetails.mockResolvedValue({
        data: { innovation_use_level_id: null, innovation_use_level_explanation: null, actors: [], organizations: [], quantifications: [] },
        successfulRequest: true
      });

      await component.getData();
      fixture.detectChanges();

      const actorCards = fixture.debugElement.queryAll(By.directive(InnovationUseActorItemComponent));
      const organizationCards = fixture.debugElement.queryAll(By.directive(InnovationUseOrganizationItemComponent));
      const quantificationCards = fixture.debugElement.queryAll(By.directive(QuantificationItemComponent));

      // R-IUR-002 AC.1: empty `actors` from the API ⇒ zero rendered actor cards (no seed).
      expect(actorCards.length).toBe(0);
      expect(organizationCards.length).toBe(0);
      expect(quantificationCards.length).toBe(0);

      // R-IUR-002 scenario: the section still renders its guidance callout and the
      // `Add other actor` button, and no card.
      expect(fixture.nativeElement.textContent).toContain('List every actor group using this innovation.');
      expect(fixture.nativeElement.textContent).toContain('Add other actor');

      // R-IUR-001 S1's BUT: the removed message must not render in this (or any) state.
      expect(fixture.nativeElement.textContent).not.toContain('At least one actor is required');
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
      // node, scoped to the `app-textarea` instance itself — not by an unscoped `.text-red-500`
      // class query and not by an unscoped page-wide text search. Both would also match the level
      // stepper's own bare `*` asterisk (its label uses the same class —
      // `innovation-use-details.component.html:15`) and pass vacuously regardless of which
      // asterisk actually rendered. (Attempt-4: the prior parenthetical here pointed at a same-
      // file REWORK block that a later diff removed — `A-N4` — replaced with a self-contained
      // rationale that names no in-file line.)
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
      // T-09: scoped to the detailsCard so T-09's new Related Innovation Development card's
      // required state does not conflate with the justification's required message.
      const detailsCard = fixture.debugElement
        .queryAll(By.css('.section-title'))
        .find(c => c.nativeElement.textContent.trim() === 'INNOVATION USE DETAILS')?.parent?.nativeElement as HTMLElement;
      expect(detailsCard.textContent).not.toContain('This field is required');
      // REWORK (Issue 5): "does not block completion" is the criterion's other half and has no
      // save path to exercise until buildPayload()/PATCH exist (T-08) — owned by T-08 c14 /
      // T-09 c6, not claimed as discharged here.
    });
  });

  // ---------------------------------------------------------------------------------------------
  // c10 — required messaging/asterisk boundaries: card 2's at-least-one-actor message is gone in
  // every state (R-IUR-011 AC.1 / DD-7 reversion — rewritten, not deleted: revision 1's premise
  // that the message renders when actors is empty no longer holds); cards 3 and 4 (Organizations,
  // Other quantitative measures) each carry required-field asterisks on specific fields only,
  // asserted per field below — not as a whole-card presence/absence claim.
  // ---------------------------------------------------------------------------------------------
  describe('c10 — required messaging boundaries', () => {
    it('does not show the at-least-one-actor message when actors is empty', () => {
      component.body.set({ ...component.body(), actors: [] });
      fixture.detectChanges();

      expect(fixture.nativeElement.textContent).not.toContain('At least one actor is required');
    });

    it('does not show the at-least-one-actor message once an actor row exists', () => {
      component.body.set({ ...component.body(), actors: [new InnovationUseActor()] });
      fixture.detectChanges();

      expect(fixture.nativeElement.textContent).not.toContain('At least one actor is required');
    });

    // T-12 REWRITE (R-IUR-010 AC.1): this used to assert NO asterisk anywhere on the
    // quantifications card — that premise is reversed by this requirement. Measures now DO carry
    // asterisks, on Number and Unit; Comments does not. The organizationsCard half is covered by
    // the T-08 REWORK comment below — it is not unchanged either.
    it('renders Organization type and count asterisks on the Organizations card; renders Number/Unit asterisks (not Comments) on the Other quantitative measures card (R-IUR-007 AC.1 / R-IUR-010 AC.1)', () => {
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
      const quantificationsCard = cards.find(card => card.nativeElement.textContent.trim() === 'OTHER QUANTITATIVE MEASURES')?.parent
        ?.nativeElement as HTMLElement;

      // T-08 REWORK (R-IUR-007 AC.1): T-12 pointed this half at T-07/T-08 rather than asserting it
      // unchanged, and it is not unchanged. On the unknown path (`is_organization_known: false`,
      // this fixture's default via `new InnovationUseOrganization()`), two fields on this card now
      // carry the required asterisk: `Organization type` (card-owned markup, unconditional, in
      // innovation-use-organization-item.component.html) and `Organization count` (forwarded to
      // `app-input`, whose own `@if (isRequired || requiredMode !== 'off')` renders the asterisk
      // because this field passes `[label]` with `[requiredMode]="'positive'"`). No other labelled
      // field on this card (e.g. Sub-type, not rendered while `institution_type_id` is undefined)
      // carries one. Asserted per field, keyed on the label each asterisk belongs to — the shape
      // the quantifications half above already uses — because a whole-card cohort count cannot
      // express "these two fields carry asterisks and nothing else does" (KZ-001).
      const orgLabels = Array.from(organizationsCard.querySelectorAll('.label'));
      const organizationTypeLabel = orgLabels.find(label => label.textContent?.trim().startsWith('Organization type'));
      const organizationCountLabel = orgLabels.find(label => label.textContent?.trim().startsWith('Organization count'));

      expect(orgLabels.length).toBe(2);
      expect(organizationTypeLabel).toBeTruthy();
      expect(organizationCountLabel).toBeTruthy();
      expect(organizationTypeLabel!.querySelector('span')?.textContent?.trim()).toBe('*');
      expect(organizationCountLabel!.querySelector('span')?.textContent?.trim()).toBe('*');

      // R-IUR-010 AC.1, asserted per field rather than per card: Number and Unit each carry the
      // red `*` beside their label; Comments does not.
      const quantLabels = Array.from(quantificationsCard.querySelectorAll('h2.label'));
      const numberLabel = quantLabels.find(label => label.textContent?.trim().startsWith('Number'));
      const unitLabel = quantLabels.find(label => label.textContent?.trim().startsWith('Unit'));
      const commentsLabel = quantLabels.find(label => label.textContent?.trim().startsWith('Comments'));

      expect(numberLabel).toBeTruthy();
      expect(unitLabel).toBeTruthy();
      expect(commentsLabel).toBeTruthy();
      expect(numberLabel!.querySelector('span')?.textContent?.trim()).toBe('*');
      expect(unitLabel!.querySelector('span')?.textContent?.trim()).toBe('*');
      expect(commentsLabel!.querySelector('span')).toBeNull();
    });

    // R-IUR-010 — the Disqualifier (T-12 work order): a green suite after removing
    // `fieldsRequired` is not evidence the five new bindings arrived — a stale binding on the
    // one template that carries it does redden, but the ABSENCE of a new binding is silent for
    // three of these five assertions (e.g. a forgotten `[unitRequiredMode]` would leave the
    // child's default `'off'` in place, and a whitespace-only Unit would stay valid — the exact
    // defect the pivot exists to close). `commentsRequired`, `numberRequiredMode` and
    // `unitRequiredMode` discriminate this way; `numberRequired`/`unitRequired` do not — both
    // default to `true` in the child, so deleting those two bindings would leave these two
    // assertions green regardless (no behavioural consequence: the resolved value is identical
    // either way). Assert the real child component's RESOLVED input values, not the template
    // text.
    it("forwards DD-4's five bindings to the real QuantificationItemComponent instance, resolved", () => {
      component.body.set({
        ...component.body(),
        quantifications: [{ id: undefined, quantification_number: undefined, unit: undefined, description: undefined }]
      });
      fixture.detectChanges();

      const quantItem = fixture.debugElement.query(By.directive(QuantificationItemComponent)).componentInstance as QuantificationItemComponent;

      expect(quantItem.numberRequired).toBe(true);
      expect(quantItem.unitRequired).toBe(true);
      expect(quantItem.commentsRequired).toBe(false);
      expect(quantItem.numberRequiredMode).toBe('nonzero');
      expect(quantItem.unitRequiredMode).toBe('filled');
    });

    // R-IUR-010 AC.4 (corrected boundary, user ruling 2026-09-04): 0 is INVALID with a message
    // distinguishable from the required message ("Must be different from 0", not "This field is
    // required") — this is the falsifying input the work order names for the zero half.
    it('Number = 0 renders invalid, with a message distinguishable from the required message', () => {
      component.body.set({
        ...component.body(),
        quantifications: [{ id: undefined, quantification_number: 0, unit: 'ha', description: '' }]
      });
      fixture.detectChanges();

      const quantCard = fixture.debugElement.query(By.directive(QuantificationItemComponent));
      const numberInput = quantCard.query(By.directive(InputComponent)).componentInstance as InputComponent;
      const verdict = numberInput.inputValid();

      expect(verdict.valid).toBe(false);
      expect(verdict.message).toBe('Must be different from 0');
      expect(verdict.message).not.toBe('This field is required');
      expect(numberInput.isInvalid()).toBe(true);
    });

    // R-IUR-010 AC.4's other half: -5 must NOT redden — `quantification_number` is a signed
    // decimal (changes/measure-number-signed-decimal), so a negative measure is legitimate and
    // the rule is `!= 0`, never `> 0`. Regression-protection, not standalone proof the mode ran:
    // a bare "valid, no message" verdict cannot by itself distinguish "requiredMode='nonzero'
    // evaluated -5 and passed" from "no mode ran at all" — that distinguishing power comes from
    // the 0 case above (which DOES redden) plus the resolved-mode assertion two tests up.
    it('Number = -5 renders valid — no amber, no message (regression-protection, read alongside the 0 case above)', () => {
      component.body.set({
        ...component.body(),
        quantifications: [{ id: undefined, quantification_number: -5, unit: 'ha', description: '' }]
      });
      fixture.detectChanges();

      const quantCard = fixture.debugElement.query(By.directive(QuantificationItemComponent));
      const numberInput = quantCard.query(By.directive(InputComponent)).componentInstance as InputComponent;
      const verdict = numberInput.inputValid();

      expect(verdict.valid).toBe(true);
      expect(verdict.message).toBe('');
      expect(numberInput.isInvalid()).toBe(false);
    });

    // R-IUR-010 S1's AND IT MUST + AC.6 (reassigned to T-12 by the 2026-09-04 pivot): a
    // whitespace-only Unit must redden. This is the pivot's whole justification — before
    // `unitRequiredMode` existed, `Unit` reached `app-input` only through the boolean
    // `unitRequired` -> `isRequired`, whose branch is `!value || value.length === 0`; `'   '` is
    // truthy with `length === 3`, so it evaluated valid and the row saved unsubmittable with
    // nothing on screen (DC-2b + DC-3).
    it("Unit = '   ' (whitespace-only) renders invalid — proof that unitRequiredMode is load-bearing", () => {
      component.body.set({
        ...component.body(),
        quantifications: [{ id: undefined, quantification_number: 4, unit: '   ', description: '' }]
      });
      fixture.detectChanges();

      const quantCard = fixture.debugElement.query(By.directive(QuantificationItemComponent));
      const inputs = quantCard.queryAll(By.directive(InputComponent));
      // Selected by `optionValue` (a public @Input), not position — a new field inserted before
      // Unit would otherwise leave this positional lookup silently checking the wrong node.
      const unitInput = inputs.find(i => (i.componentInstance as InputComponent).optionValue === 'unit')!.componentInstance as InputComponent;
      const verdict = unitInput.inputValid();

      expect(verdict.valid).toBe(false);
      expect(verdict.message).toBe('This field is required');
    });

    // R-IUR-010 AC.3: Comments stays optional. Empty renders no asterisk (covered above) and no
    // required message.
    it('Comments empty renders no required message', () => {
      component.body.set({
        ...component.body(),
        quantifications: [{ id: undefined, quantification_number: 4, unit: 'ha', description: '' }]
      });
      fixture.detectChanges();

      const quantCard = fixture.debugElement.query(By.directive(QuantificationItemComponent)).nativeElement as HTMLElement;
      expect(quantCard.textContent).not.toContain('This field is required');
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
      quantificationControls.forEach(control => expect((control.nativeElement as HTMLInputElement | HTMLTextAreaElement).disabled).toBe(true));
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
      // R-IUC-002: a known-path row carries no organization count, regardless of whether
      // institution_id is actually picked yet.
      expect(payload.organizations[0].organization_count).toBeNull();
    });
  });

  // ---------------------------------------------------------------------------------------------
  // R-IUC-002 — organization_count is nulled at the payload boundary on the known path, and
  // round-trips verbatim on the unknown path. Nulling happens only for organization_count; it
  // does not touch institution_id or row inclusion (organizationIdentitySatisfied is unchanged).
  // ---------------------------------------------------------------------------------------------
  describe('T-02 buildPayload() — R-IUC-002: organization_count is nulled at the payload boundary', () => {
    it('nulls organization_count on a known-path row that also carries a real institution_id, while still sending institution_id', () => {
      component.body.set({
        ...component.body(),
        organizations: [{ ...new InnovationUseOrganization(), is_organization_known: true, institution_id: 501, organization_count: 12 }]
      });

      const row = component.buildPayload().organizations[0];

      expect(row.organization_count).toBeNull();
      expect(row.institution_id).toBe(501);
    });

    it("sends an unknown-path row's organization_count verbatim, with institution_id null", () => {
      component.body.set({
        ...component.body(),
        organizations: [{ ...new InnovationUseOrganization(), is_organization_known: false, institution_type_id: 10, organization_count: 12 }]
      });

      const row = component.buildPayload().organizations[0];

      expect(row.organization_count).toBe(12);
      expect(row.institution_id).toBeNull();
    });

    it('builds both outcomes in one payload: known-path row nulled, unknown-path row verbatim (AC.3)', () => {
      component.body.set({
        ...component.body(),
        organizations: [
          { ...new InnovationUseOrganization(), is_organization_known: true, institution_id: 501, organization_count: 12 },
          { ...new InnovationUseOrganization(), is_organization_known: false, institution_type_id: 10, organization_count: 7 }
        ]
      });

      const [known, unknown] = component.buildPayload().organizations;

      expect(known.organization_count).toBeNull();
      expect(unknown.organization_count).toBe(7);
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

  describe('T-11 buildPayload() — innovation_dev_result_id serialization (R-IUL-008)', () => {
    it('1. untouched -> the key is ABSENT from the serialized body', () => {
      component.body.set({ ...new GetInnovationUseDetails(), innovation_dev_result_id: undefined });
      const serialized = JSON.stringify(component.buildPayload());
      expect(JSON.parse(serialized).innovation_dev_result_id).toBeUndefined();
    });

    it('2. selected -> the key is present with the numeric id', () => {
      component.body.set({ ...new GetInnovationUseDetails(), innovation_dev_result_id: 123 });
      const serialized = JSON.stringify(component.buildPayload());
      expect(JSON.parse(serialized).innovation_dev_result_id).toBe(123);
    });

    it('3. cleared -> the key is PRESENT with value null', () => {
      component.body.set({ ...new GetInnovationUseDetails(), innovation_dev_result_id: null });
      const serialized = JSON.stringify(component.buildPayload());
      // FALSIFIER (binding): swap to ?? undefined in buildPayload -> this test MUST go red
      expect(JSON.parse(serialized).innovation_dev_result_id).toBeNull();
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
  describe("T-08 saveData() — c13: an unchanged section sends every existing row's id through the actual PATCH", () => {
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
    it('closes the removeDuplicates collision: a known-organization row no longer carries a live institution_type_id to collide on', () => {
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
  // R-IUR-008 (T-09) / DD-5b — end-to-end through the emitted row: the card clears a stale
  // sub-type to an explicit `null` on a type change, that `null` propagates through
  // `onOrganizationUpdate` into `body()`, and `buildOrganizationPayload` forwards it into the
  // PATCH body's serialized JSON rather than letting `JSON.stringify` drop it as `undefined`
  // would be (DD-5b). This is the falsifying-input scenario named in tasks.md verbatim: select a
  // type with sub-types, choose a sub-type, switch to a type without sub-types, save.
  // -------------------------------------------------------------------------------------------------
  describe('R-IUR-008 (T-09) / DD-5b — a type change never leaves a stale sub_institution_type_id in the serialized payload', () => {
    it('switching the rendered card from a sub-typed type (with a chosen sub-type) to one without sub-types serializes sub_institution_type_id as an explicit null, never omitted', async () => {
      component.body.set({
        ...component.body(),
        organizations: [{ ...new InnovationUseOrganization(), is_organization_known: false, institution_type_id: 10 }]
      });
      fixture.detectChanges();
      await fixture.whenStable();
      fixture.detectChanges();

      const cardInstance = fixture.debugElement.queryAll(By.directive(InnovationUseOrganizationItemComponent))[0]
        .componentInstance as InnovationUseOrganizationItemComponent;

      // Choose a sub-type (mock resolves `[{ code: 1, name: 'Sub A' }]` for type 10 — see
      // `GET_SubInstitutionTypes` at the top of this file).
      cardInstance.onSubTypeChange(1);
      fixture.detectChanges();
      await fixture.whenStable();
      expect(component.body().organizations[0].sub_institution_type_id).toBe(1);

      // Switch to a type with no sub-types (any code other than 10 resolves zero rows here).
      await cardInstance.onInstitutionTypeChange(20);
      fixture.detectChanges();
      await fixture.whenStable();
      fixture.detectChanges();

      expect(component.body().organizations[0].sub_institution_type_id).toBeNull();

      const payload = component.buildPayload();
      const serialized = JSON.stringify(payload.organizations[0]);
      // The disqualifying check the task brief calls out by name: a `toBeUndefined()`/property
      // check passes for both the bug (value dropped to `undefined`) and the fix (value `null`),
      // because both read as "not present"/"falsy" on a plain object read. Only the SERIALIZED
      // form distinguishes them — `undefined` disappears from `JSON.stringify`, `null` does not.
      expect(serialized).toContain('"sub_institution_type_id":null');
    });
  });

  // -------------------------------------------------------------------------------------------------
  // T-10 (R-IUR-015, DD-12) — the organization card's toggle-clearing (`onKnownToggle`) must reach
  // the PARENT's `body()` through the real `(update)` binding, not just the card's own local state
  // (Disqualifier: "the card's effect emits upward; if the cleared row is not what the parent
  // holds, buildOrganizationPayload still sees the old values. Assert the emitted row" — the
  // parent-level half of that assertion belongs here per the task's own Verify split).
  // -------------------------------------------------------------------------------------------------
  describe("T-10 (R-IUR-015 AC.1/AC.2, DD-12) — the toggle's clearing reaches the PARENT's body(), not just the card's local state", () => {
    it('ticking known clears the unknown-path fields in body() through the real (update) binding', () => {
      component.body.set({
        ...component.body(),
        organizations: [
          {
            ...new InnovationUseOrganization(),
            is_organization_known: false,
            institution_type_id: 10,
            sub_institution_type_id: 1,
            institution_type_custom_name: 'stale',
            organization_count: 5
          }
        ]
      });
      fixture.detectChanges();

      const cardInstance = fixture.debugElement.queryAll(By.directive(InnovationUseOrganizationItemComponent))[0]
        .componentInstance as InnovationUseOrganizationItemComponent;

      cardInstance.onKnownToggle(true);
      fixture.detectChanges();

      const row = component.body().organizations[0];
      expect(row.institution_type_id).toBeNull();
      expect(row.sub_institution_type_id).toBeNull();
      expect(row.institution_type_custom_name).toBeNull();
      expect(row.organization_count).toBeNull();
    });

    it('unticking clears institution_id in body() through the real (update) binding', () => {
      component.body.set({
        ...component.body(),
        organizations: [{ ...new InnovationUseOrganization(), is_organization_known: true, institution_id: 501 }]
      });
      fixture.detectChanges();

      const cardInstance = fixture.debugElement.queryAll(By.directive(InnovationUseOrganizationItemComponent))[0]
        .componentInstance as InnovationUseOrganizationItemComponent;

      cardInstance.onKnownToggle(false);
      fixture.detectChanges();

      expect(component.body().organizations[0].institution_id).toBeNull();
    });
  });

  // -------------------------------------------------------------------------------------------------
  // R-IUR-014 AC.4b, and the concrete DD-5b-style hazard the brief's "question you must answer
  // first" names: does clearing to `undefined` (the actor-card exemplar's own value) reintroduce
  // the DD-5b bug on a toggle-back-and-save path? `organization_count` is the reachable case here
  // — unlike `sub_institution_type_id` (always force-reset to `null` by `onInstitutionTypeChange`
  // on every type change, T-09), nothing re-touches `organization_count` when the unknown path's
  // identity (`institution_type_id`) is re-selected after a tick+untick round trip. Sequence:
  // fill unknown path -> tick (clears institution_type_id + organization_count) -> untick (leaves
  // them cleared) -> re-select the SAME institution type (re-satisfies the row's identity,
  // WITHOUT touching organization_count) -> save. If the clear had left `undefined`,
  // `buildOrganizationPayload`'s `known === false` branch would forward `row.organization_count`
  // (`undefined`) verbatim, `JSON.stringify` would drop the key, and a stale server value would
  // survive under an empty-looking UI. `null` is forwarded explicitly instead — proven on the
  // SERIALIZED payload (KZ-001), never on the object read alone (both a dropped key and an
  // explicit `null` read as "falsy"/"not present" on a plain property access).
  // -------------------------------------------------------------------------------------------------
  describe('R-IUR-014 AC.4b / DD-5b interaction (T-10) — a toggle-then-save succeeds, and a field that becomes ACTIVE again after the round trip still serializes as an explicit null', () => {
    // Regression protection only — non-discriminating under either DD-12 mutation (reverting
    // onKnownToggle, or null->undefined): both mutants still pass this assertion. Its
    // discriminating red arrives with T-13's save gate; R-IUR-014 AC.4b is assigned to T-10 + T-13.
    it('R-IUR-014 AC.4b: fill the unknown path, tick, pick an institution, save — the save succeeds', async () => {
      component.body.set({
        ...component.body(),
        innovation_use_level_id: idForLevel(2),
        organizations: [{ ...new InnovationUseOrganization(), is_organization_known: false, institution_type_id: 10, organization_count: 5 }]
      });
      fixture.detectChanges();

      const cardInstance = fixture.debugElement.queryAll(By.directive(InnovationUseOrganizationItemComponent))[0]
        .componentInstance as InnovationUseOrganizationItemComponent;

      cardInstance.onKnownToggle(true);
      fixture.detectChanges();
      cardInstance.onInstitutionChange(501);
      fixture.detectChanges();

      await component.saveData();

      expect(apiService.PATCH_InnovationUseDetails).toHaveBeenCalled();
      const [, sent] = apiService.PATCH_InnovationUseDetails.mock.calls.at(-1)!;
      expect(sent.organizations[0]).toEqual(
        expect.objectContaining({
          is_organization_known: true,
          institution_id: 501,
          institution_type_id: null,
          sub_institution_type_id: null,
          institution_type_custom_name: null,
          organization_count: null
        })
      );
    });

    it('fill unknown path, tick, untick, re-select the same type, save: organization_count serializes as an explicit null, never dropped as undefined', async () => {
      component.body.set({
        ...component.body(),
        innovation_use_level_id: idForLevel(2),
        organizations: [{ ...new InnovationUseOrganization(), is_organization_known: false, institution_type_id: 10, organization_count: 5 }]
      });
      fixture.detectChanges();

      const cardInstance = fixture.debugElement.queryAll(By.directive(InnovationUseOrganizationItemComponent))[0]
        .componentInstance as InnovationUseOrganizationItemComponent;

      cardInstance.onKnownToggle(true); // leaves the unknown path -> clears institution_type_id + organization_count
      fixture.detectChanges();
      cardInstance.onKnownToggle(false); // back to the unknown path; institution_type_id/organization_count stay cleared
      fixture.detectChanges();
      await cardInstance.onInstitutionTypeChange(10); // re-identifies the row WITHOUT touching organization_count
      fixture.detectChanges();

      await component.saveData();

      const [, sent] = apiService.PATCH_InnovationUseDetails.mock.calls.at(-1)!;
      // The row must still be present — its identity (institution_type_id) was restored.
      expect(sent.organizations.length).toBe(1);
      const serialized = JSON.stringify(sent.organizations[0]);
      expect(serialized).toContain('"organization_count":null');
    });
  });

  // -------------------------------------------------------------------------------------------------
  // R-IUR-008 (T-09) / DD-5b — the `institution_type_custom_name` half of the same statement T-09
  // fixed for `sub_institution_type_id`. Fixed under a user ruling recorded during T-10 (an
  // advisory the Reviewer raised on T-10's own diff); it discharges no T-10 acceptance criterion.
  // `onInstitutionTypeChange` cleared `sub_institution_type_id` to an explicit `null` (T-09) but
  // left `institution_type_custom_name` clearing to `undefined` on the same statement — same
  // defect class, half done. Reachable: a saved unknown-path row with type 78 (OTHER) and a
  // non-empty custom name, user changes the type to a non-OTHER type, save. On the unknown path
  // `buildOrganizationPayload` forwards `institution_type_custom_name: known ? null :
  // row.institution_type_custom_name` verbatim; `undefined` there is dropped by `JSON.stringify`
  // and a stale server-side custom name survives under a UI that shows it gone. Proven on the
  // SERIALIZED payload (KZ-001) — a `toBeUndefined()`/`toBeNull()` property check passes for both
  // the bug and the fix, which is why this defect class survived T-09 in the first place.
  // -------------------------------------------------------------------------------------------------
  describe('R-IUR-008 / DD-5b (T-10, user-ruled fix) — a type change never leaves a stale institution_type_custom_name in the serialized payload', () => {
    it('switching the rendered card from OTHER (type 78, with a custom name) to a non-OTHER type serializes institution_type_custom_name as an explicit null, never omitted', async () => {
      component.body.set({
        ...component.body(),
        organizations: [
          {
            ...new InnovationUseOrganization(),
            is_organization_known: false,
            institution_type_id: 78,
            institution_type_custom_name: 'Stale Custom Name'
          }
        ]
      });
      fixture.detectChanges();
      await fixture.whenStable();
      fixture.detectChanges();

      const cardInstance = fixture.debugElement.queryAll(By.directive(InnovationUseOrganizationItemComponent))[0]
        .componentInstance as InnovationUseOrganizationItemComponent;

      await cardInstance.onInstitutionTypeChange(10);
      fixture.detectChanges();
      await fixture.whenStable();
      fixture.detectChanges();

      const payload = component.buildPayload();
      const serialized = JSON.stringify(payload.organizations[0]);
      expect(serialized).toContain('"institution_type_custom_name":null');
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
        () =>
          new Promise(resolve => {
            resolveGet = resolve;
          })
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
        actors: [
          { ...new InnovationUseActor(), actor_type_id: 1, sex_age_disaggregation_not_apply: false, women_youth_count: 3, men_not_youth_count: 2 }
        ]
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
        actors: [
          { ...new InnovationUseActor(), result_actors_id: 1, actor_type_id: 1, sex_age_disaggregation_not_apply: true, actors_count: 1, total: 1 }
        ]
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

  describe('T-13 (R-IUR-014 AC.5, R-IUR-017/DD-18, T-13 Pivot) — a duplicate actor type no longer gates the save', () => {
    // INVERTS the withdrawn T-09 c3 above, which asserted the save was refused. R-IUR-017/DD-18
    // moves duplicate prevention into the dropdown (T-21 — disables the already-taken type at
    // source); this page raises no save-time gate of its own any more.
    // regression-protection: observed RED against HEAD by temporarily restoring
    // `&& !this.hasDuplicateActorType()` to saveData()'s guard — with that clause back, this
    // exact test fails (`PATCH_InnovationUseDetails` is never called). Reverting the clause turns
    // it green again — see the Implementer report for the verbatim run.
    it('issues the PATCH even when two actor rows share the same actor_type_id', async () => {
      component.body.set({
        ...component.body(),
        actors: [
          { ...new InnovationUseActor(), actor_type_id: 1, sex_age_disaggregation_not_apply: true, actors_count: 4 },
          { ...new InnovationUseActor(), actor_type_id: 1, sex_age_disaggregation_not_apply: true, actors_count: 2 }
        ]
      });

      await component.saveData();

      expect(apiService.PATCH_InnovationUseDetails).toHaveBeenCalledTimes(1);
      const [, sent] = apiService.PATCH_InnovationUseDetails.mock.calls[0];
      expect(sent.actors).toHaveLength(2);
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

  // =================================================================================================
  // T-21 (R-IUR-017/DD-18, T-13 Pivot) — the parent computes which actor types are already taken
  // (self excluded) and wires that set into each card as `usedActorTypeIds`. The disable/exemption
  // logic itself is card-owned (asserted in innovation-use-actor-item.component.spec.ts against the
  // RENDERED p-select overlay, per this task's Disqualifier) — these tests cover only the parent's
  // half: does the right set reach the right row, and does it stay LIVE off `body().actors` (AC.4).
  // =================================================================================================
  describe('T-21 (R-IUR-017/DD-18) — usedActorTypeIds wiring', () => {
    it("wires each row the OTHER rows' actor_type_ids, excluding its own index", () => {
      component.body.set({
        ...component.body(),
        actors: [{ ...new InnovationUseActor(), actor_type_id: 1 }, { ...new InnovationUseActor(), actor_type_id: 2 }, new InnovationUseActor()]
      });
      fixture.detectChanges();

      const cards = fixture.debugElement.queryAll(By.directive(InnovationUseActorItemComponent));
      expect(cards.length).toBe(3);
      // Row 0 (type 1): sees row 1's type (2), never its own (1).
      expect(cards[0].componentInstance.usedActorTypeIds).toEqual(new Set([2]));
      // Row 1 (type 2): sees row 0's type (1), never its own (2).
      expect(cards[1].componentInstance.usedActorTypeIds).toEqual(new Set([1]));
      // Row 2 (blank): sees both other rows' types.
      expect(cards[2].componentInstance.usedActorTypeIds).toEqual(new Set([1, 2]));
    });

    it('a blank actor_type_id on another row contributes nothing to the set', () => {
      component.body.set({
        ...component.body(),
        actors: [new InnovationUseActor(), { ...new InnovationUseActor(), actor_type_id: 1 }]
      });
      fixture.detectChanges();

      const cards = fixture.debugElement.queryAll(By.directive(InnovationUseActorItemComponent));
      expect(cards[1].componentInstance.usedActorTypeIds).toEqual(new Set());
    });

    // AC.4 (R-IUR-017) — falsifying input: removing the row that held a type must re-enable it on
    // the surviving row's wiring. This is the "derive live, never cache" trap named in the brief —
    // asserted here at the parent's own boundary (what reaches the card), which is exactly what a
    // cached-set implementation would get wrong: a memoized Set built once from the original
    // three-row body would still contain the removed row's type after the removal.
    it('removing the row that held a type re-enables it everywhere (AC.4)', () => {
      component.body.set({
        ...component.body(),
        actors: [
          { ...new InnovationUseActor(), actor_type_id: 1 },
          { ...new InnovationUseActor(), actor_type_id: 2 }
        ]
      });
      fixture.detectChanges();
      let cards = fixture.debugElement.queryAll(By.directive(InnovationUseActorItemComponent));
      expect(cards[1].componentInstance.usedActorTypeIds).toEqual(new Set([1]));

      component.removeActor(0);
      fixture.detectChanges();

      cards = fixture.debugElement.queryAll(By.directive(InnovationUseActorItemComponent));
      expect(cards.length).toBe(1);
      expect(cards[0].componentInstance.usedActorTypeIds).toEqual(new Set());
    });

    // AC.5 — this requirement adds no save-time gate: pre-existing duplicate data (two rows
    // already sharing a type) must still save. Mirrors the T-13 test above, restated for R-IUR-017
    // specifically since it is the requirement AC.5 names.
    it('a result whose stored data already contains a duplicate still saves (AC.5, no client-side block)', async () => {
      component.body.set({
        ...component.body(),
        actors: [
          { ...new InnovationUseActor(), actor_type_id: 1, sex_age_disaggregation_not_apply: true, actors_count: 4 },
          { ...new InnovationUseActor(), actor_type_id: 1, sex_age_disaggregation_not_apply: true, actors_count: 2 }
        ]
      });
      fixture.detectChanges();

      await component.saveData();

      expect(apiService.PATCH_InnovationUseDetails).toHaveBeenCalledTimes(1);
    });
  });

  // =================================================================================================
  // T-13 (R-IUR-014 AC.1-AC.4, AC.6, AC.7; DD-8 SECOND AMENDMENT; NFR-IUR-003 unnarrowed) —
  // nothing on this page gates saveData() any more. Every row buildPayload() drops still reaches
  // the PATCH for every OTHER row, and the user's only signal for the drop is the field-level
  // required message already rendered continuously (T-07/T-08/T-09, never gated on touched()) —
  // never a save-time toast (`DD-8` SECOND AMENDMENT, PRMS + BA). Every assertion below reads the
  // actual HTTP body off `apiService.PATCH_InnovationUseDetails.mock.calls`, never
  // `buildPayload()`'s return directly, per this task's Disqualifier.
  // =================================================================================================
  describe('T-13 — AC.1 / AC.6: an actor row with typed counts and no actor_type_id saves silently, marked only by the field-level message', () => {
    // regression-protection: reddened by temporarily changing `buildPayload()`'s actors filter
    // from `!!row.actor_type_id` to `true` (keep every row) — with that mutation, `sent.actors`
    // has length 1, not 0, and this test fails. Reverting the mutation turns it green again.
    it('issues the PATCH, omits the row from the sent body, and still renders "This field is required" on Actor type — with no extra toast', async () => {
      component.body.set({
        ...component.body(),
        actors: [
          {
            ...new InnovationUseActor(),
            sex_age_disaggregation_not_apply: false,
            women_youth_count: 3,
            women_not_youth_count: 2,
            men_youth_count: 1,
            men_not_youth_count: 4
          }
        ]
      });
      fixture.detectChanges();

      // AC.7 — rendered DOM, not the getter, asserted BEFORE the save: the message is immediate
      // and continuous (`OQ-1` = IMMEDIATE), so it is already on screen the instant the row exists
      // — it is not a save-time artifact. Asserted here rather than after `saveData()` because a
      // successful save's `getData()` re-read replaces `body()` with the mocked (empty) GET
      // response, which would make the row and its card vanish and turn this into a false
      // negative that has nothing to do with whether the message ever rendered (the documented
      // "residual" in `requirements.md` `R-IUR-014`).
      // regression-protection: reddened by temporarily forcing `actorTypeMissing` to return
      // `false` in innovation-use-actor-item.component.ts — with that mutation this `toContain`
      // fails because the message never renders. Reverting the mutation turns it green again.
      const card = fixture.debugElement.query(By.directive(InnovationUseActorItemComponent));
      expect(card.nativeElement.textContent).toContain('This field is required');

      await component.saveData();

      expect(apiService.PATCH_InnovationUseDetails).toHaveBeenCalledTimes(1);
      const [, sent] = apiService.PATCH_InnovationUseDetails.mock.calls[0];
      expect(sent.actors).toHaveLength(0);

      // No save-time message: the ONLY showToast call is the plain success one, scoped so this
      // cannot pass merely because some toast fired (the success toast always does).
      // regression-protection: reddened by temporarily inserting an extra
      // `this.actions.showToast({ severity: 'warning', summary: 'Innovation Use', detail: 'dropped' })`
      // call into saveData() right before navigation — with that mutation
      // `toHaveBeenCalledTimes(1)` fails (2 calls). Reverting the mutation turns it green again.
      expect(actions.showToast).toHaveBeenCalledTimes(1);
      expect(actions.showToast).toHaveBeenNthCalledWith(1, expect.objectContaining({ severity: 'success' }));
    });
  });

  describe('T-13 — AC.2: an unknown-path organization row with a count and no type saves silently, marked only by the field-level message', () => {
    // regression-protection: reddened by temporarily changing `organizationIdentitySatisfied()`
    // to always return `true` — with that mutation `sent.organizations` has length 1, not 0, and
    // this test fails. Reverting the mutation turns it green again.
    it('issues the PATCH, omits the row from the sent body, and still renders "This field is required" on Organization type', async () => {
      component.body.set({
        ...component.body(),
        organizations: [{ ...new InnovationUseOrganization(), is_organization_known: false, organization_count: 7 }]
      });
      fixture.detectChanges();

      // AC.7 — asserted BEFORE the save, same reason as the actor test above: a successful
      // save's `getData()` re-read replaces `body()` with the mocked (empty) GET response, and
      // the row (with it, its card) would no longer exist to query.
      // regression-protection: reddened by temporarily forcing `organizationTypeMissing` to
      // return `false` in innovation-use-organization-item.component.ts — with that mutation the
      // query below returns null and `.nativeElement` throws / the assertion fails. Reverting the
      // mutation turns it green again.
      const message = fixture.debugElement.query(By.css('.organization-type-required-message'));
      expect(message.nativeElement.textContent).toContain('This field is required');

      await component.saveData();

      expect(apiService.PATCH_InnovationUseDetails).toHaveBeenCalledTimes(1);
      const [, sent] = apiService.PATCH_InnovationUseDetails.mock.calls[0];
      expect(sent.organizations).toHaveLength(0);

      // regression-protection: reddened by temporarily changing
      // `organizationIdentitySatisfied()` to always return `true` — with that mutation
      // `sent.organizations` has length 1, not 0, and this test fails. Reverting the mutation
      // turns it green again.
      expect(actions.showToast).toHaveBeenCalledTimes(1);
      expect(actions.showToast).toHaveBeenNthCalledWith(1, expect.objectContaining({ severity: 'success' }));
    });
  });

  describe('T-13 — AC.2 (known path): an organization row on the known path with no institution saves silently, marked only by the field-level message', () => {
    it('issues the PATCH, omits the row from the sent body, and still renders "This field is required" on Organization', async () => {
      component.body.set({
        ...component.body(),
        organizations: [{ ...new InnovationUseOrganization(), is_organization_known: true }]
      });
      fixture.detectChanges();

      // AC.7 — asserted BEFORE the save, same reason as above.
      // regression-protection: reddened by temporarily forcing `institutionMissing` to return
      // `false` in innovation-use-organization-item.component.ts — with that mutation the query
      // below returns null and the assertion fails. Reverting the mutation turns it green again.
      const message = fixture.debugElement.query(By.css('.organization-required-message'));
      expect(message.nativeElement.textContent).toContain('This field is required');

      await component.saveData();

      expect(apiService.PATCH_InnovationUseDetails).toHaveBeenCalledTimes(1);
      const [, sent] = apiService.PATCH_InnovationUseDetails.mock.calls[0];
      expect(sent.organizations).toHaveLength(0);
      expect(actions.showToast).toHaveBeenCalledTimes(1);
      expect(actions.showToast).toHaveBeenNthCalledWith(1, expect.objectContaining({ severity: 'success' }));
    });
  });

  describe('T-13 — AC.3: an entirely blank actor row saves silently, with no extra toast', () => {
    it('issues the PATCH and omits the blank row, raising only the plain success toast', async () => {
      component.body.set({
        ...component.body(),
        actors: [new InnovationUseActor()]
      });

      await component.saveData();

      expect(apiService.PATCH_InnovationUseDetails).toHaveBeenCalledTimes(1);
      const [, sent] = apiService.PATCH_InnovationUseDetails.mock.calls[0];
      expect(sent.actors).toHaveLength(0);
      expect(actions.showToast).toHaveBeenCalledTimes(1);
      expect(actions.showToast).toHaveBeenNthCalledWith(1, expect.objectContaining({ severity: 'success' }));
    });
  });

  describe('T-13 — AC.4: a measure row missing one of its own required fields never blocks the save and raises no message of its own', () => {
    // regression-protection: reddened by temporarily AND-ing a bogus
    // `&& current.quantifications.every(q => !!q.unit)`-shaped clause into saveData()'s guard —
    // with that mutation `PATCH_InnovationUseDetails` is never called and this test fails.
    // Reverting the mutation turns it green again.
    it('issues the PATCH with the partially-filled measure row intact, unblocked by its own incomplete required fields', async () => {
      // Number filled, Unit blank: kept by quantificationRowAbsent (a number is present), and
      // Unit's OWN required message renders on QuantificationItemComponent (R-IUR-010) — but
      // that message must never become a save gate, which is what this test proves.
      component.body.set({
        ...component.body(),
        quantifications: [{ id: undefined, quantification_number: 4, unit: undefined, description: undefined }]
      });

      await component.saveData();

      expect(apiService.PATCH_InnovationUseDetails).toHaveBeenCalledTimes(1);
      const [, sent] = apiService.PATCH_InnovationUseDetails.mock.calls[0];
      expect(sent.quantifications).toHaveLength(1);
      expect(actions.showToast).toHaveBeenCalledTimes(1);
      expect(actions.showToast).toHaveBeenNthCalledWith(1, expect.objectContaining({ severity: 'success' }));
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
      component.body.set({
        ...component.body(),
        innovation_use_level_id: idForLevel(6),
        innovation_use_level_explanation: 'used across three countries'
      });
      fixture.detectChanges();

      expect(component.justificationMissing()).toBe(false);
      const detailsCard = fixture.debugElement
        .queryAll(By.css('.section-title'))
        .find(c => c.nativeElement.textContent.trim() === 'INNOVATION USE DETAILS')?.parent?.nativeElement as HTMLElement;
      expect(detailsCard.textContent).not.toContain('This field is required');

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
      component.body.set({
        ...component.body(),
        innovation_use_level_id: idForLevel(6),
        innovation_use_level_explanation: 'used across three countries'
      });
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
      const detailsCard = fixture.debugElement
        .queryAll(By.css('.section-title'))
        .find(c => c.nativeElement.textContent.trim() === 'INNOVATION USE DETAILS')?.parent?.nativeElement as HTMLElement;
      expect(detailsCard.textContent).not.toContain('This field is required');

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

    it('renders neither the removed "at least one actor is required" message nor any error state when actors is empty (R-IUR-011 AC.1)', () => {
      component.body.set({ ...component.body(), actors: [] });
      fixture.detectChanges();

      expect(component.hasDuplicateActorType()).toBe(false);
      expect(component.loadFailed()).toBe(false);
      expect(fixture.nativeElement.textContent).not.toContain('At least one actor is required');
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
      (text ?? '').replace(/\s+/g, ' ').replace(/\(\s+/g, '(').replace(/\s+\)/g, ')').trim();

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

    /** quick/innovation-use-evidence-callout-gating (2026-09-08): the evidence callout is now gated
     *  on `showJustification()` (level ≥ 6), so it is ABSENT in this describe's default fixture
     *  state — the GET mock at the top of this file returns `innovation_use_level_id: null`. Every
     *  block that asserts the callout's own content (c4 copy, c5 navigation, c12 contrast) must
     *  therefore put the component at a rendering level first. Blocks that assert the guidance
     *  bullets or the definitions link (c1, c2, c3) must NOT call this — those two stay
     *  unconditional under R-IUP-020 AC.5, and running them at the default null level is exactly
     *  what proves it. */
    const atJustificationLevel = () => {
      component.body.set({ ...component.body(), innovation_use_level_id: idForLevel(6) });
      fixture.detectChanges();
    };

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
      beforeEach(atJustificationLevel);

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
        atJustificationLevel();
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
    // c6 — REWRITTEN by quick/innovation-use-evidence-callout-gating (2026-09-08). The guidance
    // block and the definitions link keep their unconditional contract (R-IUP-020 AC.5, unchanged);
    // the evidence callout no longer does — R-IUP-021 AC.5 and its "Evidence guidance is not gated
    // on the justification's condition" scenario are REVERSED by user ruling. The callout now
    // follows `showJustification()` (level ≥ 6), the same threshold as the justification textarea
    // whose absence made P1's request ("provide a brief explanation justifying…") unanswerable.
    //
    // The old block asserted all three render together at null/0/9 and carried a falsifying test
    // written specifically to catch the `@if (showJustification())` wrap. That test is not deleted
    // to make the suite green — it is INVERTED, because the property it guarded is now the defect:
    // it proved the callout was NOT gated, and its replacement below proves that it IS, at the
    // exact same boundary levels. The guidance/definitions half of every old assertion survives
    // verbatim, so a regression that accidentally gated THOSE still reddens here.
    // -----------------------------------------------------------------------------------------------
    describe('c6 — conditional evidence callout, unconditional guidance', () => {
      /** R-IUP-020 AC.5 — unchanged, and asserted at every level below so the reversal cannot
       *  silently spread from the callout to its two neighbours. */
      const assertGuidanceAndDefinitionsRender = () => {
        expect(fixture.debugElement.query(By.css('[data-testid="use-level-guidance"]'))).toBeTruthy();
        expect(fixture.debugElement.query(By.css('[data-testid="use-level-definitions-link"]'))).toBeTruthy();
        expect(findLink(CALCULATOR_URL)).toBeTruthy();
        expect(findLink(DEFINITIONS_URL)).toBeTruthy();
      };

      const assertEvidenceCalloutAbsent = () => {
        expect(fixture.debugElement.query(By.css('[data-testid="evidence-callout"]'))).toBeNull();
        expect(findButton('Click here to go there')).toBeUndefined();
      };

      const assertEvidenceCalloutRenders = () => {
        expect(fixture.debugElement.query(By.css('[data-testid="evidence-callout"]'))).toBeTruthy();
        expect(findButton('Click here to go there')).toBeTruthy();
      };

      const setLevel = (levelId: number | undefined) => {
        component.body.set({ ...component.body(), innovation_use_level_id: levelId });
        fixture.detectChanges();
      };

      it('hides the evidence callout with no level selected (null), keeping guidance + definitions', () => {
        setLevel(undefined);
        assertGuidanceAndDefinitionsRender();
        assertEvidenceCalloutAbsent();
      });

      it('hides the evidence callout at level 0, keeping guidance + definitions', () => {
        setLevel(idForLevel(0));
        assertGuidanceAndDefinitionsRender();
        assertEvidenceCalloutAbsent();
      });

      // The boundary the change is actually about: 5 is the highest level with no justification
      // field, and the screenshot that prompted the reversal was taken at exactly this level.
      it('hides the evidence callout at level 5 — the last level below the justification threshold', () => {
        setLevel(idForLevel(5));

        expect(component.showJustification()).toBe(false);
        assertGuidanceAndDefinitionsRender();
        assertEvidenceCalloutAbsent();
      });

      it('renders the evidence callout at level 6 — the first level that asks for a justification', () => {
        setLevel(idForLevel(6));

        expect(component.showJustification()).toBe(true);
        assertGuidanceAndDefinitionsRender();
        assertEvidenceCalloutRenders();
      });

      it('renders the evidence callout at level 9', () => {
        setLevel(idForLevel(9));
        assertGuidanceAndDefinitionsRender();
        assertEvidenceCalloutRenders();
      });

      // isEditableStatus() is an INDEPENDENT axis from the level: the callout is gated on the level
      // only, so a read-only result at level 6 must still show it. Asserting both halves here keeps
      // the two conditions from being accidentally fused into one.
      it('renders the evidence callout when isEditableStatus() is false but the level is 6', () => {
        submission.isEditableStatus.mockReturnValue(false);
        setLevel(idForLevel(6));

        assertGuidanceAndDefinitionsRender();
        assertEvidenceCalloutRenders();
        submission.isEditableStatus.mockReturnValue(true);
      });

      it('hides the evidence callout when isEditableStatus() is false and the level is 5', () => {
        submission.isEditableStatus.mockReturnValue(false);
        setLevel(idForLevel(5));

        assertGuidanceAndDefinitionsRender();
        assertEvidenceCalloutAbsent();
        submission.isEditableStatus.mockReturnValue(true);
      });

      // Falsifying input, INVERTED from the old c6. Reverting the template to an unconditional
      // callout must fail this at level 5 — and the assertion is written so that a lazy fix
      // (deleting the callout outright) fails it too, since level 6 must still render it.
      it('falsifying input: the callout tracks showJustification() exactly — absent at 5, present at 6, never constant', () => {
        setLevel(idForLevel(5));
        const atFive = fixture.debugElement.query(By.css('[data-testid="evidence-callout"]'));

        setLevel(idForLevel(6));
        const atSix = fixture.debugElement.query(By.css('[data-testid="evidence-callout"]'));

        expect(atFive).toBeNull();
        expect(atSix).toBeTruthy();
        // A template that always renders, or never renders, cannot satisfy both lines above.
        expect(atFive === null && atSix !== null).toBe(true);
      });

      // The callout must be its OWN @if, not merged into the textarea's block: it has to stay above
      // the textarea in DOM order. Asserting document order catches a "fix" that nests it inside.
      it('renders the callout as a sibling ABOVE the justification textarea, not nested inside it', () => {
        setLevel(idForLevel(6));

        const callout = fixture.debugElement.query(By.css('[data-testid="evidence-callout"]'))!.nativeElement as HTMLElement;
        const textarea = fixture.debugElement.query(By.css('textarea'))!.nativeElement as HTMLElement;

        expect(callout.contains(textarea)).toBe(false);
        // Node.DOCUMENT_POSITION_FOLLOWING (4) — the textarea comes after the callout.
        expect(callout.compareDocumentPosition(textarea) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
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
      // The three class-presence tests below query the evidence callout, which since
      // quick/innovation-use-evidence-callout-gating only renders at level ≥ 6. The four pure-math
      // tests do not touch the DOM at all and are unaffected either way.
      beforeEach(atJustificationLevel);

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
      const GREY_700: Rgb = [119, 124, 131]; // --ac-grey-700 — the banner BODY text's user-chosen AA exception

      // Added by quick/innovation-use-guidance-spacing-and-link-colour (2026-09-08). The falsifying
      // probe for that change found the margin half was covered by NOTHING: reverting it reddened
      // zero tests, so it could have been dropped by any later edit in silence. This pins the class.
      // ⚠️ SCOPE (KZ-017): jsdom paints nothing, so this asserts the CLASS IS PRESENT, never that
      // 8px of space is rendered. `.rs-mt-[8] { margin-top: 8px }` comes from responsive-size.scss,
      // outside this test's reach — the gap itself stays human-verified.
      // Raised from rs-mt-[8] to rs-mt-[16] (2026-09-08) so the callout's vertical margins are
      // SYMMETRIC. Asserting both halves together is the point — the defect this replaced was not
      // "no top margin" but "top ≠ bottom", which a single-sided check would not have caught.
      it('the guidance callout carries matching rs-mt-[16] / rs-mb-[16] margins', () => {
        const callout = fixture.debugElement.query(By.css('[data-testid="use-level-guidance"]'))!.nativeElement as HTMLElement;

        expect(callout.className).toContain('rs-mt-[16]');
        expect(callout.className).toContain('rs-mb-[16]');
        expect(callout.className).not.toContain('rs-mt-[8]');
      });

      // quick/innovation-use-banner-leading-and-border (2026-09-08). Same coverage gap as rs-mt-[8]
      // above: reviewers asked for these two properties by name, and NOTHING in the suite asserted
      // either, so both could be dropped in silence. Pinned on the two banners this describe owns;
      // the ACTORS and organization banners are pinned in the R3 contrast block further down.
      // ⚠️ SCOPE (KZ-017): class-presence only. jsdom paints nothing, so this cannot see a 5px rule
      // or a 17px line box — `border-l-[5px]`/`leading-[17px]` resolve in Tailwind, out of reach.
      it('both guidance and evidence banners carry border-l-[5px], matching the innovation-details reference', () => {
        const guidance = fixture.debugElement.query(By.css('[data-testid="use-level-guidance"]'))!.nativeElement as HTMLElement;
        const evidence = fixture.debugElement.query(By.css('[data-testid="evidence-callout"]'))!.nativeElement as HTMLElement;

        [guidance, evidence].forEach(el => {
          expect(el.className).toContain('border-l-[5px]');
          expect(el.className).not.toContain('border-l-[4px]');
        });
      });

      it('every banner body text element carries leading-[17px]', () => {
        const bullets = fixture.debugElement.queryAll(By.css('[data-testid="use-level-guidance"] li'));
        const paragraphs = fixture.debugElement.queryAll(By.css('[data-testid="evidence-callout"] p'));
        expect(bullets.length).toBe(4);
        expect(paragraphs.length).toBe(2);

        [...bullets, ...paragraphs].forEach(el => {
          expect((el.nativeElement as HTMLElement).className).toContain('leading-[17px]');
        });
      });

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

      // quick/innovation-use-banner-body-grey-700 (2026-09-08) moved every information banner's
      // NON-LINK text to --ac-grey-700, superseding DD-17's --ac-grey-800 body choice. The
      // grey-600 half of this assertion is kept: grey-600 (2.91:1) was rejected on its own merits
      // and is still not the intended token, so the bullets must be grey-700 and neither of the
      // other two greys.
      it('which selector won: bullets carry text-[var(--ac-grey-700)], never grey-800 or grey-600', () => {
        const bullets = fixture.debugElement.queryAll(By.css('[data-testid="use-level-guidance"] li'));
        expect(bullets.length).toBe(4);
        bullets.forEach(li => {
          const className = (li.nativeElement as HTMLElement).className;
          expect(className).toContain('text-[var(--ac-grey-700)]');
          expect(className).not.toContain('text-[var(--ac-grey-800)]');
          expect(className).not.toContain('text-[var(--ac-grey-600)]');
        });
      });

      it('which selector won: P1/P2 carry text-[var(--ac-grey-700)]', () => {
        const paragraphs = fixture.debugElement.queryAll(By.css('[data-testid="evidence-callout"] p'));
        expect(paragraphs.length).toBe(2);
        paragraphs.forEach(p => {
          const className = (p.nativeElement as HTMLElement).className;
          expect(className).toContain('text-[var(--ac-grey-700)]');
          expect(className).not.toContain('text-[var(--ac-grey-800)]');
        });
      });

      // The banner recolour applies to BODY TEXT ONLY — all three links/buttons keep
      // --ac-light-blue-400 and stay AA. (A previous same-day quick change briefly moved the
      // calculator link to grey-700; that was the user's mistake and is reverted. Asserting the
      // link colour explicitly here is what keeps the body-text exception from creeping into the
      // links a second time.)
      it('which selector won: all three links/buttons keep text-[var(--ac-light-blue-400)], never the body grey', () => {
        const calculatorLink = findLink(CALCULATOR_URL)!.nativeElement as HTMLElement;
        const definitionsLink = findLink(DEFINITIONS_URL)!.nativeElement as HTMLElement;
        const evidenceButton = findButton('Click here to go there')!.nativeElement as HTMLElement;

        [calculatorLink, definitionsLink, evidenceButton].forEach(el => {
          expect(el.className).toContain('text-[var(--ac-light-blue-400)]');
          expect(el.className).not.toContain('text-[var(--ac-grey-700)]');
        });
      });

      it('computes ≥ 4.5:1 for the links against the callout background (--ac-grey-100)', () => {
        const linkRatio = contrastRatio(LIGHT_BLUE_400, GREY_100);

        expect(linkRatio).toBeCloseTo(6.35, 1);
        expect(linkRatio).toBeGreaterThanOrEqual(4.5);
      });

      // The exception, MEASURED and pinned rather than left implicit. R-IUP-020 AC.6 and
      // NFR-IUP-001 require ≥ 4.5:1 and DD-17 chose --ac-grey-800 (7.44:1) to meet it;
      // --ac-grey-700 does not reach it. This test asserts the shortfall ON PURPOSE, so the
      // deviation is a recorded number in the suite instead of an undocumented regression — and so
      // that restoring an AA colour becomes a deliberate act that reddens this test, not a silent
      // drift. The superseded 7.44:1 is asserted alongside it, so the size of what was traded away
      // stays visible at the point of the trade.
      it('records the banner body text as a DELIBERATE AA exception: --ac-grey-700 is 3.91:1 on --ac-grey-100, below 4.5:1', () => {
        const exceptionRatio = contrastRatio(GREY_700, GREY_100);
        const supersededRatio = contrastRatio(GREY_800, GREY_100);

        expect(exceptionRatio).toBeCloseTo(3.91, 1);
        expect(exceptionRatio).toBeLessThan(4.5);
        // Still above the 3:1 floor WCAG applies to large text / non-text contrast.
        expect(exceptionRatio).toBeGreaterThan(3);
        // What DD-17 had, for comparison at the point of the trade.
        expect(supersededRatio).toBeCloseTo(7.44, 1);
        expect(supersededRatio).toBeGreaterThanOrEqual(4.5);
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
    it("does not bind [step] — PrimeNG's own default of 1 (whole-unit stepping) applies", () => {
      component.addQuantification();
      fixture.detectChanges();

      const quantCard = fixture.debugElement.query(By.directive(QuantificationItemComponent));
      const inputNumberInstance = quantCard.query(By.directive(InputNumber)).componentInstance as InputNumber;

      expect(inputNumberInstance.step).toBe(1);
    });

    it("decrementing from 0 goes below zero — min is negative here, so PrimeNG's validateValue() does not clamp at 0", () => {
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
  const GREY_600: Rgb = [141, 146, 153]; // --ac-grey-600 — superseded for the ACTORS callout body,
  // but the LIVE token on the ACTOR #/ORGANIZATION # eyebrows since quick/innovation-use-eyebrow-grey (accepted 2.91:1)
  const GREY_700: Rgb = [119, 124, 131]; // --ac-grey-700 — the banner BODY text's user-chosen AA exception (2026-09-08)
  const LIGHT_BLUE_300: Rgb = [22, 137, 202]; // --ac-light-blue-300 — superseded for the stepper/org-link,
  // but the LIVE token on the three Add-other buttons since quick/innovation-use-add-button-style (accepted 3.84:1)
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

  it('loadFailed banner: text-[var(--ac-grey-800)] on --ac-grey-100 (>= 4.5:1); border + icon stay --ac-red-1 (R-IUW-002 scenario 2, AC.6)', () => {
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

    // AC.6 (T-03) — scenario 2 THEN + AND IT MUST: this is a section-level failure
    // (loadFailed()), not field validation, so §7.1 assigns it red — the border and icon must
    // stay --ac-red-1 and must NOT move to the warning token added by T-01/T-02.
    const bannerContainer = (banner!.nativeElement as HTMLElement).closest('div');
    expect(bannerContainer).toBeTruthy();
    expect(bannerContainer!.className).toContain('border-[var(--ac-red-1)]');
    expect(bannerContainer!.className).not.toContain('border-[var(--ac-warning-1)]');

    const bannerIcon = bannerContainer!.querySelector('i.material-symbols-rounded');
    expect(bannerIcon).toBeTruthy();
    expect((bannerIcon as HTMLElement).className).toContain('text-[var(--ac-red-1)]');
    expect((bannerIcon as HTMLElement).className).not.toContain('text-[var(--ac-warning-1)]');

    component.loadFailed.set(false);
  });

  // -----------------------------------------------------------------------------------------------
  // T-03 (changes/innovation-use-validation-warning-color) — R-IUW-002 scenario 3, AC.7 (DD-8).
  // `justificationError()` (`:114`) and `unaddressedSaveErrors()` (`:249`) are complementary
  // filters over the SAME `saveErrors()` array (single `set` at `:599`). This is the trap T-02 was
  // required NOT to touch — colouring one amber and leaving the other red would paint one server
  // error list in two colours in this single reachable state (a save returning both a
  // justification error and an actor-row error).
  // -----------------------------------------------------------------------------------------------
  it('details:114 and details:249 both stay --ac-red-1 — one saveErrors() array never renders in two colours (R-IUW-002 scenario 3, DD-8, AC.7)', () => {
    // A level >= 6 is required for showJustification() to render the `:114` block at all
    // (innovation-use-details.component.ts JUSTIFICATION_MIN_LEVEL = 6).
    component.body.set({ ...component.body(), innovation_use_level_id: idForLevel(7) });
    // Two messages from the SAME saveErrors() array: one names the justification field
    // (renders at `:114` via justificationError()), one names an actor-row field with no
    // page binding (renders at `:249` via unaddressedSaveErrors()).
    component.saveErrors.set(['innovation_use_level_explanation is required at this level', 'actors.0.actor_type_id must not be empty']);
    fixture.detectChanges();

    const justificationSpan = fixture.debugElement
      .queryAll(By.css('span'))
      .find(s => (s.nativeElement as HTMLElement).textContent === 'innovation_use_level_explanation is required at this level');
    expect(justificationSpan).toBeTruthy();
    const justificationBlock = (justificationSpan!.nativeElement as HTMLElement).closest('div');
    expect(justificationBlock).toBeTruthy();
    expect(justificationBlock!.className).toContain('text-[var(--ac-red-1)]');
    expect(justificationBlock!.className).not.toContain('text-[var(--ac-warning-1)]');

    const unaddressedSpan = fixture.debugElement
      .queryAll(By.css('span'))
      .find(s => (s.nativeElement as HTMLElement).textContent === 'actors.0.actor_type_id must not be empty');
    expect(unaddressedSpan).toBeTruthy();
    const unaddressedBlock = (unaddressedSpan!.nativeElement as HTMLElement).closest('div');
    expect(unaddressedBlock).toBeTruthy();
    expect(unaddressedBlock!.className).toContain('text-[var(--ac-red-1)]');
    expect(unaddressedBlock!.className).not.toContain('text-[var(--ac-warning-1)]');

    // The two filters must never diverge in colour — both carry --ac-red-1, never one warning
    // and one red.
    expect(justificationBlock!.className.includes('text-[var(--ac-red-1)]')).toBe(unaddressedBlock!.className.includes('text-[var(--ac-red-1)]'));
  });

  // -----------------------------------------------------------------------------------------------
  // T-03 (changes/innovation-use-validation-warning-color) — DD-9: the validation role
  // (--ac-warning-1, the 8 client-side field-validation sites T-02 moved off --ac-red-1) joins
  // this R3 instrument with a DOCUMENTED, CITED EXCEPTION instead of being silently omitted —
  // omission is exactly the gap R3 exists to close (D-7, requirements.md §6).
  //
  // MEASURED (not asserted >= 4.5:1 — it fails): --ac-warning-1 = [230, 159, 0] measures
  // 2.09:1 on --ac-grey-100 and 2.25:1 on --ac-white-1, both below the 4.5:1 design.md §10 /
  // PRD C-4 text minimum this block otherwise enforces (AR-1, requirements.md §8).
  //
  // ACCEPTED (AR-1, DR-1): the amber is a fixed, pre-existing brand value that this change did
  // not introduce and has no authority to alter (DR-1 — Option A/the value is out of scope); the
  // deviation was already live and app-wide (22 other files) before this spec, and Innovation Use
  // was the outlier, not the standard. A follow-up design-system ticket to correct the amber
  // app-wide is OWED (requirements.md §8 AR-1; tasks.md §5 RB-1) — not filed by this task.
  //
  // SCOPE OF THIS EXCEPTION (KZ-017): every constant in this R3 block (WHITE_1, GREY_100, …) is
  // the LIGHT-theme value only, so this whole instrument — every role in it, not only this one —
  // is light-mode-only by construction; this exception is scoped the same way and proves nothing
  // about dark mode. The dark-mode deviation is real and spans both themes (requirements.md §8
  // AR-1, corrected — the single home of this spec's contrast figures; accepted by the user as
  // Pivot option A, tracked as tasks.md §5 RB-5), and no dark-mode assertion is added below — R3
  // does not cover dark mode for any role.
  // -----------------------------------------------------------------------------------------------
  describe('validation role (--ac-warning-1): documented AA exception, not an omission (DD-9, AR-1, DR-1, D-7)', () => {
    const WARNING_AMBER: Rgb = [230, 159, 0]; // --ac-warning-1
    const RED_1: Rgb = [207, 8, 8]; // --ac-red-1 — this role's pre-token value, used by the falsifier below

    it('grey-100 sites (actor:3 required message, actor:34 select border): text-[var(--ac-warning-1)], measured 2.09:1, below 4.5:1', () => {
      // Naturally rendered by this describe's own beforeEach: the one actor row
      // (new InnovationUseActor()) has no actor_type_id, so actorTypeMissing is unconditionally
      // true (innovation-use-actor-item.component.ts get actorTypeMissing()) — no extra setup.
      const actorItem = fixture.debugElement.query(By.css('app-innovation-use-actor-item'));
      expect(actorItem).toBeTruthy();

      const requiredMessage = actorItem
        .queryAll(By.css('span'))
        .find(s => (s.nativeElement as HTMLElement).textContent?.trim() === 'This field is required');
      expect(requiredMessage).toBeTruthy();
      // The colour utility sits on the message's containing div (#requiredMessage template), not
      // on the span itself — innovation-use-actor-item.component.html:3.
      const requiredMessageContainer = (requiredMessage!.nativeElement as HTMLElement).closest('div');
      expect(requiredMessageContainer).toBeTruthy();
      expect(requiredMessageContainer!.className).toContain('text-[var(--ac-warning-1)]');
      expect(requiredMessageContainer!.className).not.toContain('text-[var(--ac-red-1)]');

      // T-04 (RB-6, DD-10, D-8) realignment: the select border moved from a Tailwind class
      // (never painted on a PrimeNG element — DD-4 falsified) to a `[style]` object binding.
      // `element.style.border` cannot read it back in jsdom for a `var(...)` colour value (the
      // `cssstyle` parser silently drops the whole shorthand — verified empirically; see the
      // longer note on the `c8`/`c8b` tests this mirrors, in
      // innovation-use-actor-item.component.spec.ts), so this spies on the accessor Angular's
      // binding actually writes through instead of reading the (unreadable-here) DOM back.
      // Angular's styling engine memoizes the last-applied value per property and skips a
      // redundant re-write when a render repeats the same computed string — this describe's own
      // `beforeEach` already rendered the missing state before the spy below exists, so a bare
      // extra `detectChanges()` here would (and, verified, does) produce zero spy calls, not
      // because nothing is bound but because nothing CHANGED. Toggling the row to valid and
      // back to missing forces the value to actually differ between cycles, which is what makes
      // the write — and the spy — observable.
      const selectDe = actorItem.query(By.css('p-select'));
      expect(selectDe).toBeTruthy();
      const actorRow = component.body().actors[0];
      component.onActorUpdate(0, { ...actorRow, actor_type_id: 1 });
      fixture.detectChanges();
      // T-12 (Forward Pointer 2, KZ-001, corrected in rework — see execution.md): scoped to the
      // p-select's OWN `style` accessor, not the whole `CSSStyleDeclaration` prototype. The page
      // template renders the actor card and the measures card in one component, so once a
      // fixture in this describe renders a measure row with an empty/whitespace-only `Unit`, that
      // row's `app-input` (a `pInputText` branch, tokenized by T-02) would emit this identical
      // `[style]` literal from its own DOM node, and a prototype-wide spy could not attribute the
      // write to the p-select specifically. That emission would come from
      // `[unitRequiredMode]="'filled'"` alone — with a mode active, `inputValid()` returns
      // `evaluateRequiredMode(value)` and never reaches the legacy `isRequired` branch
      // (`input.component.ts:47-49` states the precedence: the mode owns the verdict outright),
      // and `'filled'` covers empty AND whitespace-only via `isFilled()`'s `trim()`.
      // `[unitRequired]` drives only the asterisks (`quantification-item.component.html:23`,
      // `input.component.html:6`), not the `[style]` write.
      // This describe's own `beforeEach` (above, in this same describe block) resolves
      // `quantifications: []` and this test never adds a row, so no `app-quantification-item` — and therefore no Unit
      // `app-input` — exists in THIS fixture: the hazard is precautionary, not currently
      // reachable, and this rescope is defensive against a future fixture in this describe that
      // renders a measure row. Spying on the p-select's own native `.style` object keeps the
      // assertion pinned to the one element it claims to prove regardless.
      const borderSetSpy = jest.spyOn(selectDe!.nativeElement.style as CSSStyleDeclaration, 'border', 'set');
      component.onActorUpdate(0, { ...actorRow, actor_type_id: undefined });
      fixture.detectChanges();
      expect(borderSetSpy).toHaveBeenCalledWith('2px solid var(--ac-warning-1)');
      borderSetSpy.mockRestore();

      const ratio = contrastRatio(WARNING_AMBER, GREY_100);
      expect(ratio).toBeCloseTo(2.09, 2);
      expect(ratio).toBeLessThan(4.5);
    });

    it('white-1 site (stepper:4 required message): text-[var(--ac-warning-1)], measured 2.25:1, below 4.5:1', () => {
      // The stepper's own required message only renders with no level selected
      // (innovation-use-level-stepper.component.html:4, `@if (!selectedLevel)`) — clear it to
      // reach that state.
      component.body.set({ ...component.body(), innovation_use_level_id: undefined });
      fixture.detectChanges();

      const stepper = fixture.debugElement.query(By.css('app-innovation-use-level-stepper'));
      expect(stepper).toBeTruthy();

      const requiredMessage = stepper
        .queryAll(By.css('span'))
        .find(s => (s.nativeElement as HTMLElement).textContent?.trim() === 'This field is required');
      expect(requiredMessage).toBeTruthy();
      // The colour utility sits on the message's containing div, not on the span itself —
      // innovation-use-level-stepper.component.html:4.
      const requiredMessageContainer = (requiredMessage!.nativeElement as HTMLElement).closest('div');
      expect(requiredMessageContainer).toBeTruthy();
      expect(requiredMessageContainer!.className).toContain('text-[var(--ac-warning-1)]');
      expect(requiredMessageContainer!.className).not.toContain('text-[var(--ac-red-1)]');

      const ratio = contrastRatio(WARNING_AMBER, WHITE_1);
      expect(ratio).toBeCloseTo(2.25, 2);
      expect(ratio).toBeLessThan(4.5);
    });

    // Falsifying input (K-004/KZ-014): substituting this role's PRE-token value (--ac-red-1) into
    // the same formula reports a PASSING ratio — proving the validation role's failing reading
    // above is a genuine property of the amber, not an artifact of a contrastRatio() that always
    // reports below 4.5:1.
    it("falsifying input: substituting --ac-red-1 (this role's pre-token value) reports 5.29:1 and PASSES 4.5:1", () => {
      const ratio = contrastRatio(RED_1, GREY_100);
      expect(ratio).toBeCloseTo(5.29, 1);
      expect(ratio).toBeGreaterThanOrEqual(4.5);
    });
  });

  // ACCEPTED EXCEPTION (quick/innovation-use-banner-body-grey-700, 2026-09-08) — human-decided,
  // applied to EVERY information banner in this feature for visual consistency. The ACTORS callout
  // body moved from --ac-grey-800 (7.44:1 on this callout's --ac-grey-100) to --ac-grey-700, which
  // measures 3.91:1 and does NOT meet 1.4.3 AA (>= 4.5:1). It clears the 3:1 non-text floor only.
  // Pinned so a later token sweep cannot silently "re-fix" it without reading this comment.
  it('ACTORS callout body: text-[var(--ac-grey-700)] on --ac-grey-100, 3.91:1 accepted (AA exception)', () => {
    const body = fixture.debugElement
      .queryAll(By.css('span'))
      .find(s => (s.nativeElement as HTMLElement).textContent?.trim() === 'List every actor group using this innovation.');
    expect(body).toBeTruthy();
    expect((body!.nativeElement as HTMLElement).className).toContain('text-[var(--ac-grey-700)]');
    expect((body!.nativeElement as HTMLElement).className).not.toContain('text-[var(--ac-grey-800)]');
    expect((body!.nativeElement as HTMLElement).className).not.toContain('text-[var(--ac-grey-600)]');
    // quick/innovation-use-banner-leading-and-border: the ACTORS banner's share of the shape
    // alignment. Border width is asserted on the wrapper in the sibling test below.
    expect((body!.nativeElement as HTMLElement).className).toContain('leading-[17px]');

    const ratio = contrastRatio(GREY_700, GREY_100);
    expect(ratio).toBeCloseTo(3.91, 1);
    expect(ratio).toBeLessThan(4.5);
    expect(ratio).toBeGreaterThan(3);
  });

  // ACCEPTED EXCEPTION (quick/innovation-use-add-button-style, 2026-09-03) — human-decided.
  // These three buttons were realigned to innovation-dev's visual treatment (border, text and
  // 7px radius all on --ac-light-blue-300 / #1689ca) for cross-section consistency. That KNOWINGLY
  // reverts DD-17's text-token choice for this role: #1689ca on --ac-white-1 measures 3.84:1,
  // which clears WCAG 1.4.11 non-text (>= 3:1, the border) but NOT 1.4.3 AA for the 15px label
  // (>= 4.5:1). The four prose links in this template keep --ac-light-blue-400 and are unaffected.
  // This test now PINS the exception so a future token sweep cannot silently re-break or
  // "re-fix" it without a human reading this comment.
  it('Add-other buttons (actor/organization/measure): text+border --ac-light-blue-300 on --ac-white-1, 3.84:1 accepted', () => {
    ['Add other actor', 'Add other organization', 'Add other measure'].forEach(label => {
      const btn = fixture.debugElement.queryAll(By.css('button')).find(b => (b.nativeElement as HTMLElement).textContent?.includes(label));
      expect(btn).toBeTruthy();
      const className = (btn!.nativeElement as HTMLElement).className;
      expect(className).toContain('text-[var(--ac-light-blue-300)]');
      expect(className).toContain('border-[var(--ac-light-blue-300)]');
      expect(className).toContain('rounded-[7px]');
      expect(className).not.toContain('text-[var(--ac-light-blue-400)]');
    });

    const ratio = contrastRatio(LIGHT_BLUE_300, WHITE_1);
    expect(ratio).toBeCloseTo(3.84, 1);
    // Clears non-text contrast (the 2px border), documented as short of AA for the label.
    expect(ratio).toBeGreaterThanOrEqual(3);
    expect(ratio).toBeLessThan(4.5);
  });

  // ACCEPTED EXCEPTION (quick/innovation-use-eyebrow-grey, 2026-09-03) — human-decided, emphasized.
  // The ACTOR # / ORGANIZATION # card eyebrows were realigned to innovation-dev's eyebrow colour
  // (#8d9299 == --ac-grey-600) for cross-section consistency; the MEASURE # eyebrow in the SHARED
  // quantification-item already hardcoded #8D9299, so it needed no edit and is not pinned here.
  // This KNOWINGLY reverts DD-17's eyebrow token: --ac-grey-600 on --ac-grey-100 measures 2.91:1,
  // which fails WCAG 1.4.3 AA (>= 4.5:1) and also the 3:1 large-text floor — and at 13px this text
  // is not large. Deeper than the sibling Add-button exception (3.84:1). Pinned so a future token
  // sweep cannot silently re-break or "re-fix" it without a human reading this comment.
  it('actor card eyebrow "ACTOR # n": text-[var(--ac-grey-600)] on --ac-grey-100, 2.91:1 accepted', () => {
    const eyebrow = fixture.debugElement
      .queryAll(By.css('app-innovation-use-actor-item span'))
      .find(s => (s.nativeElement as HTMLElement).textContent?.includes('ACTOR #'));
    expect(eyebrow).toBeTruthy();
    expect((eyebrow!.nativeElement as HTMLElement).className).toContain('text-[var(--ac-grey-600)]');
    expect((eyebrow!.nativeElement as HTMLElement).className).not.toContain('text-[var(--ac-grey-800)]');

    const ratio = contrastRatio(GREY_600, GREY_100);
    expect(ratio).toBeCloseTo(2.91, 1);
    expect(ratio).toBeLessThan(4.5);
  });

  it('organization card eyebrow "ORGANIZATION # n": text-[var(--ac-grey-600)] on --ac-grey-100, 2.91:1 accepted', () => {
    const eyebrow = fixture.debugElement
      .queryAll(By.css('app-innovation-use-organization-item span'))
      .find(s => (s.nativeElement as HTMLElement).textContent?.includes('ORGANIZATION #'));
    expect(eyebrow).toBeTruthy();
    expect((eyebrow!.nativeElement as HTMLElement).className).toContain('text-[var(--ac-grey-600)]');
    expect((eyebrow!.nativeElement as HTMLElement).className).not.toContain('text-[var(--ac-grey-800)]');

    const ratio = contrastRatio(GREY_600, GREY_100);
    expect(ratio).toBeCloseTo(2.91, 1);
    expect(ratio).toBeLessThan(4.5);
  });

  // Same ACCEPTED EXCEPTION as the ACTORS callout above (quick/innovation-use-banner-body-grey-700).
  // NOTE THE DIFFERENT BACKGROUND: this banner sits on --ac-grey-200, not --ac-grey-100, so its
  // ratio is 3.51:1 — the WORST of the four banners, and lower than the 3.91:1 the other three
  // measure. Asserting the distinct number here (rather than reusing 3.91) is the point: the two
  // backgrounds are not interchangeable, and a sweep that assumed one figure for all banners would
  // be wrong about this one. Superseded --ac-grey-800 measured 6.68:1 on this same background.
  it('organization known-institution callout body: text-[var(--ac-grey-700)] on --ac-grey-200, 3.51:1 accepted (AA exception)', () => {
    const orgItem = fixture.debugElement.query(By.css('app-innovation-use-organization-item'));
    const calloutBody = orgItem
      .queryAll(By.css('span'))
      .find(s => (s.nativeElement as HTMLElement).textContent?.includes("Can't find the institution"));
    expect(calloutBody).toBeTruthy();
    expect((calloutBody!.nativeElement as HTMLElement).className).toContain('text-[var(--ac-grey-700)]');
    expect((calloutBody!.nativeElement as HTMLElement).className).not.toContain('text-[var(--ac-grey-800)]');
    expect((calloutBody!.nativeElement as HTMLElement).className).toContain('leading-[17px]');

    const ratio = contrastRatio(GREY_700, GREY_200);
    expect(ratio).toBeCloseTo(3.51, 1);
    expect(ratio).toBeLessThan(4.5);
    expect(ratio).toBeGreaterThan(3);
    // The superseded token, for comparison at the point of the trade.
    expect(contrastRatio(GREY_800, GREY_200)).toBeCloseTo(6.68, 1);
  });

  // quick/innovation-use-banner-leading-and-border (2026-09-08): border width for the two banners
  // NOT covered by the c12 block above, so all four are pinned between the two describes. The
  // organization banner is the one that changed shorthand — it was `border-l-4`, not `border-l-[4px]`
  // — which is why it is asserted by its own selector rather than swept with the others.
  it('ACTORS and organization banners carry border-l-[5px], matching the innovation-details reference', () => {
    // Both selectors require the border class AND the identifying copy: matching on text alone
    // returns an inner layout wrapper (the first attempt here found `flex flex-col rs-gap-[4]`),
    // and matching on the border class alone would not prove WHICH banner was inspected.
    const bannerWithText = (scope: typeof fixture.debugElement, text: string) =>
      scope
        .queryAll(By.css('div'))
        .find(d => (d.nativeElement as HTMLElement).className.includes('border-l-') && (d.nativeElement as HTMLElement).textContent?.includes(text));

    const actorsBanner = bannerWithText(fixture.debugElement, 'List every actor group using this innovation.');
    const orgItem = fixture.debugElement.query(By.css('app-innovation-use-organization-item'));
    const orgBanner = bannerWithText(orgItem, "Can't find the institution");

    expect(actorsBanner).toBeTruthy();
    expect(orgBanner).toBeTruthy();
    [actorsBanner!, orgBanner!].forEach(el => {
      const className = (el.nativeElement as HTMLElement).className;
      expect(className).toContain('border-l-[5px]');
      expect(className).not.toContain('border-l-[4px]');
      // `border-l-4` is Tailwind's 4px shorthand — the pre-change value on the organization banner.
      expect(className).not.toMatch(/border-l-4(\s|$)/);
    });
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
    // Filtered on the white fill the unselected branch actually sets, NOT on the absence of the
    // selected fill: since quick/innovation-use-level-fill the selected button carries
    // bg-[var(--ac-light-blue-300)], and a negative filter on the old -400 marker would silently
    // reclassify it as unselected and then assert the wrong text token against it.
    const unselected = buttons.filter(b => (b.nativeElement as HTMLElement).className.includes('bg-[var(--ac-white-1)]'));
    expect(unselected.length).toBeGreaterThan(0);
    unselected.forEach(b => {
      expect((b.nativeElement as HTMLElement).className).toContain('text-[var(--ac-light-blue-400)]');
      expect((b.nativeElement as HTMLElement).className).not.toContain('text-[var(--ac-light-blue-300)]');
    });

    const ratio = contrastRatio(LIGHT_BLUE_400, WHITE_1);
    expect(ratio).toBeGreaterThanOrEqual(4.5);
  });

  // ACCEPTED EXCEPTION (quick/innovation-use-level-fill, 2026-09-03) — human-decided.
  // The selected level's fill was set to --ac-light-blue-300 (#1689ca) on request, reverting R3
  // remediation F-1 / DD-17 which had re-derived it to --ac-light-blue-400 precisely because
  // white-on-#1689ca measures 3.84:1. The digit is fs-[16] at normal weight, so it is NOT large
  // text and 1.4.3 AA wants >= 4.5:1. It does clear 1.4.11 non-text (>= 3:1). Third exception in
  // this template's family, alongside quick/innovation-use-add-button-style (3.84:1) and
  // quick/innovation-use-eyebrow-grey (2.91:1). Pinned so a token sweep cannot silently flip it.
  it('stepper selected digit fill: text-[var(--ac-white-1)] on the --ac-light-blue-300 fill, 3.84:1 accepted', () => {
    const buttons = fixture.debugElement.queryAll(By.css('app-innovation-use-level-stepper button'));
    const selected = buttons.filter(b => (b.nativeElement as HTMLElement).className.includes('bg-[var(--ac-light-blue-300)]'));
    expect(selected.length).toBe(1);
    expect((selected[0].nativeElement as HTMLElement).className).toContain('text-[var(--ac-white-1)]');
    expect((selected[0].nativeElement as HTMLElement).className).not.toContain('bg-[var(--ac-light-blue-400)]');

    const ratio = contrastRatio(WHITE_1, LIGHT_BLUE_300);
    expect(ratio).toBeCloseTo(3.84, 1);
    expect(ratio).toBeGreaterThanOrEqual(3);
    expect(ratio).toBeLessThan(4.5);
  });

  // Falsifying inputs (KZ-014) — each superseded token must still measurably fail 4.5:1, proving the
  // assertions above are discriminating rather than vacuously true. K-004/KZ-014: this is the "red"
  // this block must be able to show — see the reverted-swap check run separately during verification.
  // Still a falsifier for the ACTORS CALLOUT BODY (which keeps --ac-grey-800). For the two card
  // eyebrows this same 2.91:1 is now the human-accepted exception — see the pinning tests above.
  it('falsifying input: --ac-grey-600 on --ac-grey-100 (ACTORS callout-body pre-fix token) reports 2.91:1 and fails AA', () => {
    const ratio = contrastRatio(GREY_600, GREY_100);
    expect(ratio).toBeCloseTo(2.91, 1);
    expect(ratio).toBeLessThan(4.5);
  });

  it('falsifying input: --ac-grey-700 on --ac-grey-200 (organization-callout pre-fix token) reports 3.51:1 and fails', () => {
    const ratio = contrastRatio(GREY_700, GREY_200);
    expect(ratio).toBeCloseTo(3.51, 1);
    expect(ratio).toBeLessThan(4.5);
  });

  // Still a falsifier for the stepper's UNSELECTED digit text (which keeps --ac-light-blue-400 on
  // white). This same 3.84:1 pair is now the human-accepted exception in TWO live roles: the three
  // Add-other buttons and the stepper's SELECTED fill (white-on-#1689ca) — see the pinning tests
  // above. Kept because a discriminating falsifier for the -400 roles still has to measure it.
  it('falsifying input: --ac-light-blue-300 on --ac-white-1 (unselected-digit falsifier) reports 3.84:1 and fails AA', () => {
    const ratio = contrastRatio(LIGHT_BLUE_300, WHITE_1);
    expect(ratio).toBeCloseTo(3.84, 1);
    expect(ratio).toBeLessThan(4.5);
  });

  it('falsifying input: --ac-light-blue-300 on --ac-grey-200 (organization-callout link pre-fix token) reports 3.21:1 and fails', () => {
    const ratio = contrastRatio(LIGHT_BLUE_300, GREY_200);
    expect(ratio).toBeCloseTo(3.21, 1);
    expect(ratio).toBeLessThan(4.5);
  });

  // ===============================================================================================
  // T-09 — The picker: a new "RELATED INNOVATION DEVELOPMENT" section card
  // (R-IUL-002, R-IUL-003, R-IUL-012, R-IUL-013, §6.1, §6.2, §6.5, §6.6, DD-11)
  // ===============================================================================================
  describe('T-09 — The picker: RELATED INNOVATION DEVELOPMENT section card', () => {
    let innoDevService: GetInnoDevOutputService;

    beforeEach(async () => {
      innoDevService = TestBed.inject(GetInnoDevOutputService);
      innoDevService.loading.set(false);
      innoDevService.list.set([]);
      await component.getData();
      fixture.detectChanges();
    });

    it('places the RELATED INNOVATION DEVELOPMENT card between INNOVATION USE DETAILS and ACTORS (R-IUL-013)', () => {
      const titles = fixture.debugElement.queryAll(By.css('.section-title')).map(t => t.nativeElement.textContent.trim());
      const detailsIndex = titles.findIndex(t => t.startsWith('INNOVATION USE DETAILS'));
      const relatedIndex = titles.findIndex(t => t.startsWith('RELATED INNOVATION DEVELOPMENT'));
      const actorsIndex = titles.findIndex(t => t.startsWith('ACTORS'));

      expect(detailsIndex).toBeGreaterThanOrEqual(0);
      expect(relatedIndex).toBeGreaterThanOrEqual(0);
      expect(actorsIndex).toBeGreaterThanOrEqual(0);

      expect(relatedIndex).toBeGreaterThan(detailsIndex);
      expect(relatedIndex).toBeLessThan(actorsIndex);
    });

    it('uses the byte-identical card shell class string as its sibling cards', () => {
      const cards = fixture.debugElement.queryAll(By.css('.section-title')).map(t => t.parent?.nativeElement as HTMLElement);
      const relatedCard = cards.find(c => c.querySelector('.section-title')?.textContent?.includes('RELATED INNOVATION DEVELOPMENT'))!;

      expect(relatedCard).toBeTruthy();
      expect(relatedCard.className).toContain('rounded-[13px] rs-p-[30] rs-mb-[25] border border-[var(--ac-grey-200)] bg-[var(--ac-white-1)]');
    });

    it('must NOT be nested inside the INNOVATION USE DETAILS card (R-IUL-013)', () => {
      const cards = fixture.debugElement.queryAll(By.css('.section-title')).map(t => t.parent?.nativeElement as HTMLElement);
      const detailsCard = cards.find(c => c.querySelector('.section-title')?.textContent?.includes('INNOVATION USE DETAILS'))!;
      const relatedCard = cards.find(c => c.querySelector('.section-title')?.textContent?.includes('RELATED INNOVATION DEVELOPMENT'))!;

      expect(detailsCard.contains(relatedCard)).toBe(false);
      expect(relatedCard.parentElement).toBe(detailsCard.parentElement);
    });

    it('keeps the level stepper, definition box, and calculator link inside INNOVATION USE DETAILS (nothing moved out)', () => {
      const cards = fixture.debugElement.queryAll(By.css('.section-title')).map(t => t.parent?.nativeElement as HTMLElement);
      const detailsCard = cards.find(c => c.querySelector('.section-title')?.textContent?.includes('INNOVATION USE DETAILS'))!;

      const stepperEl = fixture.debugElement.query(By.directive(InnovationUseLevelStepperComponent))?.nativeElement;
      expect(detailsCard.contains(stepperEl)).toBe(true);

      const guidanceBox = detailsCard.querySelector('[data-testid="use-level-guidance"]');
      expect(guidanceBox).not.toBeNull();

      const defsLink = detailsCard.querySelector('[data-testid="use-level-definitions-link"]');
      expect(defsLink).not.toBeNull();

      const calcLink = detailsCard.querySelector('a[href*="calculator"]');
      expect(calcLink).not.toBeNull();
    });

    it('renders the red asterisk on the section title when isRequired is true (R-IUL-003, DD-11)', () => {
      const relatedTitle = fixture.debugElement
        .queryAll(By.css('.section-title'))
        .find(t => t.nativeElement.textContent.includes('RELATED INNOVATION DEVELOPMENT'))!;
      const asterisk = relatedTitle.nativeElement.querySelector('.text-red-500');

      expect(asterisk).not.toBeNull();
      expect(asterisk?.textContent?.trim()).toBe('*');
    });

    it('renders the amber invalid border and "This field is required" message when empty (R-IUL-003)', () => {
      component.body.update(b => ({ ...b, innovation_dev_result_id: undefined }));
      fixture.detectChanges();

      const selectComp = fixture.debugElement.query(By.directive(SelectComponent)).componentInstance as SelectComponent;
      expect(selectComp.isInvalid()).toBe(true);

      const cards = fixture.debugElement.queryAll(By.css('.section-title')).map(t => t.parent?.nativeElement as HTMLElement);
      const relatedCard = cards.find(c => c.querySelector('.section-title')?.textContent?.includes('RELATED INNOVATION DEVELOPMENT'))!;

      expect(relatedCard.textContent).toContain('This field is required');
      const pSelect = relatedCard.querySelector('p-select') as HTMLElement;
      expect(pSelect.style.border.toLowerCase()).toContain('#e69f00');
    });

    it('clears the amber invalid border and "This field is required" message once a selection is set', () => {
      component.body.update(b => ({ ...b, innovation_dev_result_id: 123 }));
      fixture.detectChanges();

      const selectComp = fixture.debugElement.query(By.directive(SelectComponent)).componentInstance as SelectComponent;
      expect(selectComp.isInvalid()).toBe(false);

      const cards = fixture.debugElement.queryAll(By.css('.section-title')).map(t => t.parent?.nativeElement as HTMLElement);
      const relatedCard = cards.find(c => c.querySelector('.section-title')?.textContent?.includes('RELATED INNOVATION DEVELOPMENT'))!;

      expect(relatedCard.textContent).not.toContain('This field is required');
    });

    it('must NOT block draft save or navigation when empty (R-IUL-003 draft save preserved)', async () => {
      component.body.update(b => ({ ...b, innovation_dev_result_id: undefined }));
      fixture.detectChanges();

      await component.saveData();

      expect(apiService.PATCH_InnovationUseDetails).toHaveBeenCalled();
    });

    it('must NOT show the empty state while loading() is true (R-IUL-012, §6.5)', () => {
      // Arrange transition: start loading with empty list
      submission.isEditableStatus.mockReturnValue(true);
      innoDevService.loading.set(true);
      innoDevService.list.set([]);
      fixture.detectChanges();

      // Guarded by !loading(): disabled must be FALSE and tooltip must be EMPTY
      expect(component.isInnovationDevDisabled()).toBe(false);
      expect(component.innoDevTooltip()).toBe('');

      const selectDebug = fixture.debugElement.query(By.directive(SelectComponent));
      expect(selectDebug.componentInstance.disabled).toBe(false);

      // Now transition to loading finished with empty list
      innoDevService.loading.set(false);
      fixture.detectChanges();

      expect(component.isInnovationDevDisabled()).toBe(true);
      expect(component.innoDevTooltip()).toBe('There are no reported Innovation Development outputs to link.');
      expect(selectDebug.componentInstance.disabled).toBe(true);
    });

    it('disables the control when submission status is not editable', () => {
      submission.isEditableStatus.mockReturnValue(false);
      innoDevService.loading.set(false);
      innoDevService.list.set([{ result_id: 1, result_official_code: '100', title: 'Test', platform_code: 'STAR' } as any]);
      fixture.detectChanges();

      expect(component.isInnovationDevDisabled()).toBe(true);
    });

    it('formats option labels with platform prefix, bare fallback for null/empty platform, and handles edge cases (KZ-012, §6.3)', () => {
      // 1. With platform code
      expect(
        formatInnovationDevLabel({
          platform_code: 'STAR',
          result_official_code: 284,
          title: 'Rice bean-adzuki bean model'
        })
      ).toBe('STAR 284 - Rice bean-adzuki bean model');

      // 2. Fallback to bare numeric code when platform_code is null (never prints "null 284" or hard-codes "STAR")
      expect(
        formatInnovationDevLabel({
          platform_code: null,
          result_official_code: 284,
          title: 'Rice bean-adzuki bean model'
        })
      ).toBe('284 - Rice bean-adzuki bean model');

      // 3. Fallback when platform_code is undefined or empty string
      expect(
        formatInnovationDevLabel({
          platform_code: undefined,
          result_official_code: 284,
          title: 'Rice bean-adzuki bean model'
        })
      ).toBe('284 - Rice bean-adzuki bean model');

      expect(
        formatInnovationDevLabel({
          platform_code: '',
          result_official_code: 284,
          title: 'Rice bean-adzuki bean model'
        })
      ).toBe('284 - Rice bean-adzuki bean model');

      // 4. Null / undefined result handling
      expect(formatInnovationDevLabel(null)).toBe('');
      expect(formatInnovationDevLabel(undefined)).toBe('');
    });

    it('asserts the ERROR state uses the card-scoped error surface (2a) and keeps the control mounted', async () => {
      // Set the options request failure via the API mock
      apiService.GET_Results.mockResolvedValueOnce({ successfulRequest: false, errorDetail: { errors: 'Mock failure' } });
      await innoDevService.main();
      fixture.detectChanges();

      // Assert that GET_Results was called with indicator-codes: [2]
      expect(apiService.GET_Results).toHaveBeenCalledWith({ 'indicator-codes': [2] });

      // R-IUL-012: options request fails -> uses the card-scoped error surface
      expect(component.loadFailed()).toBe(false);

      const cards = fixture.debugElement.queryAll(By.css('.section-title')).map(t => t.parent?.nativeElement as HTMLElement);
      const relatedCard = cards.find(c => c.querySelector('.section-title')?.textContent?.includes('RELATED INNOVATION DEVELOPMENT'));
      expect(relatedCard).toBeTruthy(); // Card must stay mounted

      const errorText = Array.from(relatedCard!.querySelectorAll('span')).find(s =>
        s.textContent?.includes('Innovation Development outputs could not be loaded')
      );
      expect(errorText).toBeTruthy();

      await fixture.whenStable();
      fixture.detectChanges();

      const selectComp = fixture.debugElement.query(By.directive(SelectComponent));
      expect(selectComp).toBeTruthy(); // Control must stay mounted
      expect(selectComp.componentInstance.disabled).toBe(true); // Control must be disabled
    });

    it('asserts that with error() true, a draft save still issues its PATCH and the section stays mounted (save-path falsifier)', async () => {
      apiService.GET_Results.mockResolvedValueOnce({ successfulRequest: false, errorDetail: { errors: 'Mock failure' } });
      await innoDevService.main();
      fixture.detectChanges();

      expect(innoDevService.error()).toBe(true);
      expect(component.loadFailed()).toBe(false); // MUST NOT compose the error into loadFailed()

      await component.saveData();

      expect(apiService.PATCH_InnovationUseDetails).toHaveBeenCalled();

      const relatedCard = fixture.debugElement
        .queryAll(By.css('.section-title'))
        .map(t => t.parent?.nativeElement as HTMLElement)
        .find(c => c.querySelector('.section-title')?.textContent?.includes('RELATED INNOVATION DEVELOPMENT'));
      expect(relatedCard).toBeTruthy();
    });

    it('asserts the LOADING state shows a skeleton and no p-select (2b)', () => {
      const cache = TestBed.inject(CacheService) as unknown as CacheServiceMock;
      cache.currentResultIsLoading.set(true);
      fixture.detectChanges();

      const cards = fixture.debugElement.queryAll(By.css('.section-title')).map(t => t.parent?.nativeElement as HTMLElement);
      const relatedCard = cards.find(c => c.querySelector('.section-title')?.textContent?.includes('RELATED INNOVATION DEVELOPMENT'))!;

      const skeleton = relatedCard.querySelector('p-skeleton');
      expect(skeleton).toBeTruthy();

      const select = relatedCard.querySelector('p-select');
      expect(select).toBeNull();

      cache.currentResultIsLoading.set(false);
    });

    it('asserts the POPULATED state projects the label with prefix correctly and itemTemplate is bound (2c)', async () => {
      innoDevService.loading.set(false);
      innoDevService.list.set([{ result_id: 123, platform_code: 'STAR', result_official_code: '456', title: 'Populated test' } as any]);
      component.body.update(b => ({ ...b, innovation_dev_result_id: 123 }));
      fixture.detectChanges();
      await fixture.whenStable();
      fixture.detectChanges();

      const cards = fixture.debugElement.queryAll(By.css('.section-title')).map(t => t.parent?.nativeElement as HTMLElement);
      const relatedCard = cards.find(c => c.querySelector('.section-title')?.textContent?.includes('RELATED INNOVATION DEVELOPMENT'))!;

      const selectDebug = fixture.debugElement.query(By.directive(SelectComponent));
      const selectComp = selectDebug.componentInstance as SelectComponent;

      expect(selectComp.itemTemplate).toBeDefined();
      expect(selectComp.selectedItemTemplate).toBeDefined();

      const renderedText = relatedCard.textContent;
      expect(renderedText).toContain('STAR 456 - Populated test');
    });

    it('asserts the pTooltip directive receives the empty state tooltip correctly (2d)', () => {
      innoDevService.loading.set(false);
      innoDevService.list.set([]);
      fixture.detectChanges();

      const selectDebug = fixture.debugElement.query(By.directive(SelectComponent));

      const tooltipDirective = selectDebug.injector.get(Tooltip);
      expect(tooltipDirective).toBeTruthy();
      expect((tooltipDirective as any).content).toBe('There are no reported Innovation Development outputs to link.');
    });

    it('asserts the pTooltip directive does not receive the empty state tooltip on a failed load (R-IUL-012)', async () => {
      apiService.GET_Results.mockResolvedValueOnce({ successfulRequest: false, errorDetail: { errors: 'Mock failure' } });
      await innoDevService.main();
      fixture.detectChanges();

      const selectDebug = fixture.debugElement.query(By.directive(SelectComponent));

      const tooltipDirective = selectDebug.injector.get(Tooltip);
      expect(tooltipDirective).toBeTruthy();
      expect((tooltipDirective as any).content).not.toBe('There are no reported Innovation Development outputs to link.');
    });
  });

  describe('T-10: Page-owned card', () => {
    it('FALSIFIER (link): assert on the RENDERED DOM — the <a> href, target, and accessible name', () => {
      // FALSIFIER: If the anchor is removed from the DOM, this test MUST fail.
      component.body.set({
        ...new GetInnovationUseDetails(),
        linked_innovation_dev: {
          result_id: 123,
          platform_code: 'STAR',
          result_official_code: 284,
          title: 'Test result'
        }
      });
      fixture.detectChanges();

      const card = fixture.debugElement.query(By.css('a.innovation-detail-link'));
      expect(card).toBeTruthy();
      expect(card.nativeElement.getAttribute('href')).toBeTruthy();
      expect(card.nativeElement.getAttribute('target')).toBe('_blank');
      expect(card.nativeElement.getAttribute('rel')).toBe('noopener');
      expect(card.nativeElement.textContent).toContain('(opens in a new tab)');
    });

    it('FALSIFIER (href form): assert a STAR result yields /result/STAR-284/general-information EXACTLY, and a PRMS result yields /result/PRMS-284/general-information EXACTLY', () => {
      // FALSIFIER: Build the href from the bare code instead -> the PRMS case must go red. Build it from the space-joined display code -> both must go red.
      component.body.set({
        ...new GetInnovationUseDetails(),
        linked_innovation_dev: {
          result_id: 123,
          platform_code: 'STAR',
          result_official_code: 284,
          title: 'Test result'
        }
      });
      fixture.detectChanges();

      let card = fixture.debugElement.query(By.css('a.innovation-detail-link'));
      expect(card).toBeTruthy();
      expect(card.nativeElement.getAttribute('href')).toBe('/result/STAR-284/general-information');

      component.body.set({
        ...new GetInnovationUseDetails(),
        linked_innovation_dev: {
          result_id: 124,
          platform_code: 'PRMS',
          result_official_code: 284,
          title: 'Test result'
        }
      });
      fixture.detectChanges();

      card = fixture.debugElement.query(By.css('a.innovation-detail-link'));
      expect(card).toBeTruthy();
      expect(card.nativeElement.getAttribute('href')).toBe('/result/PRMS-284/general-information');
    });

    it('FALSIFIER (label): render with platform_code: null -> the card must read 284 - …', () => {
      // FALSIFIER: If the fallback in formatInnovationDevCode/formatInnovationDevLabel is removed, this test must fail.
      component.body.set({
        ...new GetInnovationUseDetails(),
        linked_innovation_dev: {
          result_id: 123,
          platform_code: null,
          result_official_code: 284,
          title: 'Test result'
        }
      });
      fixture.detectChanges();

      const el = fixture.nativeElement.textContent;
      expect(el).toContain('284 - Test result');
      expect(el).not.toContain('null 284 - Test result');
      expect(el).not.toContain('STAR 284 - Test result');
    });

    it('For the selection-change path, arrange the TRANSITION (render with a link, then change the selection, then detectChanges), never the end state', () => {
      // FALSIFIER (binding): deleting `(selectEvent)="onInnovationDevSelected($event)"` MUST turn this red.
      const service = TestBed.inject(GetInnoDevOutputService);
      service.list.set([
        { result_id: 123, platform_code: 'STAR', result_official_code: 284, title: 'Test result' } as any,
        { result_id: 456, platform_code: 'PRMS', result_official_code: 285, title: 'Another result' } as any
      ]);

      component.body.set({
        ...new GetInnovationUseDetails(),
        innovation_dev_result_id: 123,
        linked_innovation_dev: {
          result_id: 123,
          platform_code: 'STAR',
          result_official_code: 284,
          title: 'Test result'
        }
      });
      fixture.detectChanges();

      expect(fixture.debugElement.query(By.css('a.innovation-detail-link'))).toBeTruthy();

      // Act: select a new item via the real control
      const selectComp = fixture.debugElement.query(By.directive(SelectComponent)).componentInstance;
      selectComp.setValue(456);
      fixture.detectChanges();

      // Assert: The card re-renders with the new result's code and title
      const cardText = fixture.nativeElement.textContent;
      expect(cardText).toContain('PRMS 285 - Another result');
      expect(component.body().linked_innovation_dev?.result_id).toBe(456);
      expect(component.body().innovation_dev_result_id).toBe(456);
    });

    // NFR-IUL-003 — the card MUST be legible in BOTH themes, and this requirement explicitly does
    // NOT inherit the module's light-only QA sign-off. Measured, not assumed: the anchor's resting
    // state on the row's own grey surface is 1.46:1 in dark ([data-theme='dark'] sets
    // --ac-light-blue-400 #23466b and --ac-grey-100 #2b2b2b, colors.scss:127/:143) — the label and
    // the 2px border effectively vanish. Giving the anchor its own --ac-white-1 fill restores
    // 6.83:1 light and 7.72:1 dark, and is also closer to the mock, which shows the pill on a
    // lighter fill than the row. FALSIFIER: drop bg-[var(--ac-white-1)] from the anchor -> the
    // dark-theme assertion below goes red.
    it('NFR-IUL-003 — the View innovation detail anchor holds AA in BOTH themes, on its own fill not the grey row', () => {
      component.body.set({
        ...new GetInnovationUseDetails(),
        innovation_dev_result_id: 123,
        linked_innovation_dev: { result_id: 123, platform_code: 'STAR', result_official_code: 284, title: 'Test result' }
      });
      fixture.detectChanges();

      const anchor = fixture.debugElement.query(By.css('a.innovation-detail-link'));
      expect(anchor).toBeTruthy();
      // The fill is what makes the dark theme legible — assert it is actually on the element.
      expect((anchor.nativeElement as HTMLElement).className).toContain('bg-[var(--ac-white-1)]');

      // Light: --ac-light-blue-400 #035ba9 on --ac-white-1 #fff
      const light = contrastRatio([3, 91, 169], [255, 255, 255]);
      expect(light).toBeCloseTo(6.83, 1);
      expect(light).toBeGreaterThanOrEqual(4.5);

      // Dark ([data-theme='dark']): --ac-light-blue-400 #23466b on --ac-white-1 #e5e5e5
      const dark = contrastRatio([35, 70, 107], [229, 229, 229]);
      expect(dark).toBeCloseTo(7.72, 1);
      expect(dark).toBeGreaterThanOrEqual(4.5);

      // The pair this replaces, recorded so the regression is named: the same ink on the row's own
      // grey surface fails AA in dark by a wide margin.
      expect(contrastRatio([35, 70, 107], [43, 43, 43])).toBeLessThan(4.5);
    });

    // Amendment 07 (user request during T-12's visual check, 2026-09-09): the
    // picker had no placeholder, so an unselected control read as blank. Wording
    // follows this codebase's established convention — "Select the <thing>", as in
    // "Select the actor type" / "Select the organization type" / "Select the year".
    // Asserted on the RENDERED p-select, not on the SelectComponent input: an input
    // is what goes in, and what the reporter sees is what must be checked (KZ-017).
    // FALSIFIER: delete the placeholder attribute -> this spec goes red.
    it('Amendment 07 — the picker renders a placeholder on the p-select, in the house "Select the ..." style', () => {
      const pSelect = fixture.debugElement
        .queryAll(By.css('p-select'))
        .find(el => (el.nativeElement as HTMLElement).closest('div')?.textContent?.includes('RELATED INNOVATION DEVELOPMENT'));

      const host = pSelect ?? fixture.debugElement.query(By.directive(SelectComponent));
      expect(host).toBeTruthy();

      // The placeholder must reach the rendered control, not merely the wrapper.
      const rendered = (host.nativeElement as HTMLElement).textContent ?? '';
      const selectCmp = fixture.debugElement.query(By.directive(SelectComponent)).componentInstance as SelectComponent;

      expect(selectCmp.placeholder).toBe('Select the innovation development');
      expect(rendered).toContain('Select the innovation development');
    });

    it('soft-deleted target still renders (payload-only render source)', () => {
      // FALSIFIER (soft-deleted): re-point the card at innoDevSelect.selectedOption() instead of the payload -> this must go red.
      const service = TestBed.inject(GetInnoDevOutputService);
      service.list.set([{ result_id: 999, platform_code: 'STAR', result_official_code: 999, title: 'Unrelated result' } as any]);

      component.body.set({
        ...new GetInnovationUseDetails(),
        innovation_dev_result_id: 123,
        linked_innovation_dev: {
          result_id: 123,
          platform_code: 'STAR',
          result_official_code: 284,
          title: 'Deleted result'
        }
      });
      fixture.detectChanges();

      const cardText = fixture.nativeElement.textContent;
      expect(cardText).toContain('STAR 284 - Deleted result');
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

    // Flush any innoDevOutputService results request issued by the control or service initialization
    const resultsReqs = httpMock.match(req => req.url.includes('results') && !req.url.includes('green-checks'));
    resultsReqs.forEach(req => req.flush({ data: { results: [] }, status: 200, description: '', timestamp: '', path: '' }));

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
    GET_SubInstitutionTypes: jest.fn().mockResolvedValue({ data: [], successfulRequest: true }),
    GET_Results: jest.fn().mockResolvedValue({ data: { results: [] }, successfulRequest: true })
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
