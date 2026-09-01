// @akili-spec docs/specs/innovation-use/details-page (T-07 — innovation use details page shell)
import { Component, computed, inject, signal, WritableSignal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ApiService } from '@shared/services/api.service';
import { ActionsService } from '@shared/services/actions.service';
import { CacheService } from '@shared/services/cache/cache.service';
import { SubmissionService } from '@shared/services/submission.service';
import { VersionWatcherService } from '@shared/services/version-watcher.service';
import { GetInnovationUseLevelsService } from '@shared/services/control-list/get-innovation-use-levels.service';
import { ErrorResponse } from '@shared/interfaces/responses.interface';
import {
  GetInnovationUseDetails,
  InnovationUseActor,
  InnovationUseOrganization,
  InnovationUseQuantification
} from '@shared/interfaces/get-innovation-use-details.interface';
import { FormHeaderComponent } from '@shared/components/form-header/form-header.component';
import { NavigationButtonsComponent } from '@shared/components/navigation-buttons/navigation-buttons.component';
import { TextareaComponent } from '@shared/components/custom-fields/textarea/textarea.component';
import { QuantificationItemComponent, QuantificationItemData } from '@components/quantification-item/quantification-item.component';
import { InnovationUseLevelStepperComponent } from './components/innovation-use-level-stepper/innovation-use-level-stepper.component';
import { InnovationUseActorItemComponent } from './components/innovation-use-actor-item/innovation-use-actor-item.component';
import { InnovationUseOrganizationItemComponent } from './components/innovation-use-organization-item/innovation-use-organization-item.component';
import {
  RESULT_ENTRY_SOURCE_QUERY,
  RESULT_ENTRY_SOURCE_VALUE_HOME,
  RESULT_ENTRY_SOURCE_VALUE_RESULTS_CENTER
} from '@shared/constants/result-entry-source';
import { deriveMaxForScale } from '@utils/quantification-number-bound.util';

/** §6.4 / R-IUP-006 AC.4: the justification is gated on the resolved `level`, never on the id. */
const JUSTIFICATION_MIN_LEVEL = 6;

// @akili-spec docs/specs/changes/measure-number-signed-decimal (T-11 — DD-5/DD-14: scale 4, the
// derived symmetric bound, and the new placeholder copy for the Number field's app-input at this
// call site only). `max`/`min` are DERIVED from `QUANTIFICATION_NUMBER_SCALE` via `deriveMaxForScale`
// rather than hard-coded literals, so the scale and its bound cannot drift apart (R-MSD-012 AC.3).
/** The `quantification_number` column's scale (`DECIMAL(24,4)`, DD-1) — also bound as `maxFractionDigits`. */
const QUANTIFICATION_NUMBER_SCALE = 4;
const QUANTIFICATION_NUMBER_MAX = deriveMaxForScale(QUANTIFICATION_NUMBER_SCALE);
const QUANTIFICATION_NUMBER_MIN = -QUANTIFICATION_NUMBER_MAX;
/** R-MSD-008 / SC-4: the shared card's default ("Enter a positive number") is false here — signed values are allowed. */
const QUANTIFICATION_NUMBER_PLACEHOLDER = 'Enter a number';

/**
 * R-IUP-020 (Amendment 01 / T-14, §5.8) — the guidance callout's calculator link and the
 * definitions link's target, as module-level `const`s rather than inline template literals so
 * both the template binding and this task's `c3` spec assertion read from the one place.
 */
const INNOVATION_USE_CALCULATOR_URL = 'https://www.scalingreadiness.org/calculator-use-headless/';
const INNOVATION_USE_DEFINITIONS_URL = 'https://drive.google.com/file/d/1RFDAx3m5ziisZPcFgYdyBYH9oTzOYLvC/view';

/** UN "Youth" global-issues page — the source for the 15-24 age range the ACTORS callout cites. */
const UN_YOUTH_DEFINITION_URL = 'https://www.un.org/en/global-issues/youth';

/**
 * §6.6 / R-IUP-009 AC.2: CLARISA actor-type value reserved for "OTHER". A client-side literal,
 * not an import — `ClarisaActorTypesEnum.OTHER = 5` exists only in the server tree
 * (server/researchindicators/src/domain/tools/clarisa/entities/clarisa-actor-types/enum/); a
 * grep of client/research-indicators/src returns zero matches. Mirrors the identical literal
 * already declared inside `InnovationUseActorItemComponent` (design.md §5.4 / judgment.md C-2)
 * — duplicated here rather than imported, because the card is a pure `@Input`/`@Output`
 * component (DD-5) and this page must not reach into its internals to read the constant.
 */
const OTHER_ACTOR_TYPE_ID = 5;

/**
 * §6.5 step 5 / c6: the shape a PATCH body's rows take. Every id field here is `number |
 * undefined` and is a straight passthrough of whatever `body()` already carried for that row —
 * `buildPayload()` never assigns one. See the id-write-site enumeration on `buildPayload()` below.
 */
interface InnovationUseActorPayload {
  result_actors_id?: number;
  actor_type_id?: number;
  actor_type_custom_name?: string;
  sex_age_disaggregation_not_apply: boolean;
  women_youth_count?: number | null;
  women_not_youth_count?: number | null;
  men_youth_count?: number | null;
  men_not_youth_count?: number | null;
  actors_count?: number | null;
}

interface InnovationUseOrganizationPayload {
  result_institution_type_id?: number;
  institution_id?: number | null;
  institution_type_id?: number | null;
  sub_institution_type_id?: number | null;
  institution_type_custom_name?: string | null;
  is_organization_known: boolean;
  organization_count?: number;
}

interface InnovationUseQuantificationPayload {
  id?: number;
  quantification_number?: number;
  unit?: string;
  description?: string;
}

export interface InnovationUsePayload {
  innovation_use_level_id?: number;
  innovation_use_level_explanation?: string;
  actors: InnovationUseActorPayload[];
  organizations: InnovationUseOrganizationPayload[];
  quantifications: InnovationUseQuantificationPayload[];
}

/**
 * Page shell for the Innovation Use details section (indicator 6). Shape follows
 * `capacity-sharing` — `app-page-wrapper` -> `app-form-header` -> four titled cards ->
 * `app-navigation-buttons` (DD-1). No accordion.
 *
 * Scope (T-07): layout, the four UI states (loading/empty/error/success), and the conditional
 * justification. T-08 adds `buildPayload()` and the save-then-navigate flow (`saveData()`),
 * replacing the T-07 placeholder `navigate()` that only handled §6.7 step 6.
 */
@Component({
  selector: 'app-innovation-use-details',
  standalone: true,
  imports: [
    FormsModule,
    FormHeaderComponent,
    NavigationButtonsComponent,
    TextareaComponent,
    QuantificationItemComponent,
    InnovationUseLevelStepperComponent,
    InnovationUseActorItemComponent,
    InnovationUseOrganizationItemComponent
  ],
  templateUrl: './innovation-use-details.component.html'
})
export default class InnovationUseDetailsComponent {
  api = inject(ApiService);
  actions = inject(ActionsService);
  cache = inject(CacheService);
  submission = inject(SubmissionService);
  router = inject(Router);
  route = inject(ActivatedRoute);
  versionWatcher = inject(VersionWatcherService);
  levelsService = inject(GetInnovationUseLevelsService);

  body: WritableSignal<GetInnovationUseDetails> = signal(new GetInnovationUseDetails());

  /** R-IUP-020 (Amendment 01 / T-14): template-bindable mirrors of the module-level consts above. */
  readonly calculatorUrl = INNOVATION_USE_CALCULATOR_URL;
  readonly definitionsUrl = INNOVATION_USE_DEFINITIONS_URL;
  readonly youthDefinitionUrl = UN_YOUTH_DEFINITION_URL;

  /**
   * T-11 (DD-5/DD-14): template-bindable mirrors of the module-level consts above, forwarded to the
   * Number field's `app-input` instance via `QuantificationItemComponent`'s `min`/`max`/
   * `maxFractionDigits`/`placeholder` inputs (T-10, DD-4). `min`/`max` are the derived symmetric
   * bound for scale 4, never a hard-coded literal (R-MSD-012 AC.3) — `step` is deliberately NOT
   * bound (DD-6): PrimeNG's own default of `1` already gives whole-unit stepping across zero.
   */
  readonly quantificationNumberScale = QUANTIFICATION_NUMBER_SCALE;
  readonly quantificationNumberMax = QUANTIFICATION_NUMBER_MAX;
  readonly quantificationNumberMin = QUANTIFICATION_NUMBER_MIN;
  readonly quantificationNumberPlaceholder = QUANTIFICATION_NUMBER_PLACEHOLDER;

  /**
   * DD-11 — distinct from an empty `body`, and never inferred from its shape. A failed GET sets
   * this and leaves `body` completely untouched, so the error surface can never be confused with
   * the empty-record state (R-IUP-004 AC.3 / c4).
   */
  loadFailed = signal(false);

  /**
   * REWORK (Issue 3) — extends the failed-load guard above to the *stale-success* subset: during
   * the in-flight window after a version switch, `body` still holds the previous version's rows
   * while `loadFailed()` is `false`, because `resultInterceptor` resolves the version from the URL
   * at request time. Set at the start of `getData()` and cleared on every exit — mirroring
   * `capacity-sharing`'s own `this.loading` — and consulted by `saveData()` alongside
   * `loadFailed()` so a Save/Next click cannot PATCH one version's rows against another's.
   */
  loading = signal(false);

  /**
   * §6.7 step 5 / TRD §6.3: messages extracted from a failed PATCH's `errorDetail.errors`,
   * normalized to a flat string list regardless of whether the server sent one string or several.
   * The generic message always reaches the user via `ActionsService`'s toast (below); this signal
   * additionally drives the one inline, field-scoped rendering this page can address by a stable
   * name — the justification textarea (`justificationError`, below `showJustification`).
   */
  saveErrors = signal<string[]>([]);

  constructor() {
    this.versionWatcher.onVersionChange(() => {
      this.getData();
    });
  }

  /** §6.4: resolved on the catalog row's `level` — never on `innovation_use_level_id` (the trap). */
  resolvedLevel = computed<number | undefined>(() => {
    const id = this.body().innovation_use_level_id;
    return this.levelsService.list().find(level => level.id === id)?.level;
  });

  /** Hides the textarea below level 6 without ever touching its value (R-IUP-006). */
  showJustification = computed<boolean>(() => (this.resolvedLevel() ?? Number.NEGATIVE_INFINITY) >= JUSTIFICATION_MIN_LEVEL);

  /**
   * §6.6 / R-IUP-006 AC.2, R-IUP-014 AC.3. At the resolved `level >= 6`, the justification is
   * blank-or-whitespace-only. **T-02 (bugfix/innovation-use-draft-save) / DD-4:** this no longer
   * gates `saveData()` — R-IUD-001 makes an incomplete justification save like every other
   * incomplete field. What survives is the template-only half: it still gates
   * `justificationWhitespaceOnly()` below (R-IUD-003) and, via `innovation_use_validation` on the
   * server (untouched), keeps the section's green check `false` until real text is saved, which
   * keeps the Submit button disabled (R-IUD-002).
   *
   * **REWORK (Reviewer FAIL, attempt 1, pre-dating T-02):** trimming here without a matching trim
   * on the rendered side is exactly the bug that originally shipped — `app-textarea`'s own
   * `isInvalid()` checks `value.length === 0` untrimmed, so a whitespace-only value renders no
   * message there even though this computed (which trims) considers it missing. Kept here rather
   * than editing the shared `app-textarea`/`TextareaComponent` (DD-2, out of scope, used by many
   * other pages).
   */
  justificationMissing = computed<boolean>(() => this.showJustification() && !this.body().innovation_use_level_explanation?.trim());

  /**
   * R-IUD-003 (T-02, bugfix/innovation-use-draft-save): the page-owned required-message block's
   * gate, narrowed to the one gap `app-textarea`'s own required message cannot see.
   *
   * `app-textarea`'s `isInvalid()` is untrimmed: it already renders "This field is required" —
   * unmodified, unsuppressed — whenever the raw value is `undefined`/`null`/`''`, and stays
   * silent whenever the raw value is a non-empty string (`length > 0`), whitespace-only
   * included. `justificationMissing()` above is trimmed, so it is `true` for all three of
   * blank, `''`, *and* whitespace-only. AND-ing it with "the raw value is a non-empty string"
   * removes exactly the blank/`''` overlap, leaving only whitespace-only — the one case
   * `app-textarea` cannot flag. The two conditions are then mutually exclusive by construction
   * (one fires on raw-empty, the other on raw-non-empty-trims-empty), so exactly one message
   * ever renders for an incomplete justification, never zero and never two (R-IUD-003 AC.1-3) —
   * with no edit to, and no suppressing input passed into, `TextareaComponent` (DD-2).
   */
  justificationWhitespaceOnly = computed<boolean>(() => this.justificationMissing() && !!this.body().innovation_use_level_explanation);

  /**
   * §6.6 / R-IUP-009: rows sharing an actor identity, keyed on `actor_type_id` — or, for type
   * `5` (OTHER), on `actor_type_id` + trimmed lowercase `actor_type_custom_name` (AC.2: two
   * OTHER rows are distinguished by their custom name, not conflated by the shared type id).
   * Rows with no `actor_type_id` are excluded from the count: an empty type is the
   * required-field case (`actorTypeMissing` on the card itself), not a duplicate.
   *
   * **Falsifying input** (`design.md` §10.3): keying only on `actor_type_id` would flag two
   * OTHER rows carrying different custom names as duplicates — the trimmed-lowercase-name half
   * of this key is what keeps that from happening (c2's differing-name half).
   */
  duplicateActorTypeIndexes = computed<Set<number>>(() => {
    const indexesByKey = new Map<string, number[]>();

    this.body().actors.forEach((row, index) => {
      if (!row.actor_type_id) return;
      const key =
        row.actor_type_id === OTHER_ACTOR_TYPE_ID
          ? `${row.actor_type_id}:${(row.actor_type_custom_name ?? '').trim().toLowerCase()}`
          : `${row.actor_type_id}`;
      indexesByKey.set(key, [...(indexesByKey.get(key) ?? []), index]);
    });

    const flagged = new Set<number>();
    indexesByKey.forEach(indexes => {
      if (indexes.length > 1) indexes.forEach(index => flagged.add(index));
    });
    return flagged;
  });

  /**
   * §6.6 / R-IUP-009: save is blocked while any actor row is flagged. **Zero actor rows never
   * flags anything** — `duplicateActorTypeIndexes()` is empty on an empty `actors` array, so
   * this stays `false` and R-IUP-014 AC.3's "a draft with no actors is legal" is a structural
   * consequence of the same computed, not a separate carve-out (R-IUP-010 AC.5 / c6).
   */
  hasDuplicateActorType = computed<boolean>(() => this.duplicateActorTypeIndexes().size > 0);

  /**
   * §6.7 step 5: the one field on this page a save error can be addressed to by a stable name.
   * Array rows (actors/organizations/quantifications) have no server-assigned index in this
   * shape to bind an inline message to — every other message still reaches the user through the
   * `ActionsService` toast raised in `saveData()`.
   */
  justificationError = computed<string | undefined>(() => {
    // REWORK hardening: joins every matching message rather than only the first — class-validator
    // routinely emits more than one message naming the same property.
    const matches = this.saveErrors().filter(message => message.toLowerCase().includes('innovation_use_level_explanation'));
    return matches.length > 0 ? matches.join(' ') : undefined;
  });

  /**
   * REWORK (Issue 2): save-error messages that do not name the one field this page can address
   * inline (`innovation_use_level_explanation`, above). Rendered in a page-level block so a
   * message naming an actor/organization/quantification field is not silently dropped just
   * because this page has no per-row binding for it.
   */
  unaddressedSaveErrors = computed<string[]>(() =>
    this.saveErrors().filter(message => !message.toLowerCase().includes('innovation_use_level_explanation'))
  );

  /**
   * Adapts the server shape (`id`, `quantification_number`, `unit`, `description`) to the shared
   * card's shape (`number`, `unit`, `comments`) at this boundary, merged by array index so `id`
   * round-trips without `QuantificationItemComponent` knowing it exists (§5.6).
   *
   * T-11 (DD-3): the `number` mapping is a DEFENSIVE ASSERTION of DD-2's read-shape invariant, not a
   * second normaliser. DD-2's entity transformer already guarantees a `number` (or `null`) at the API
   * boundary; this coerces defensively in case that invariant ever lapses three layers away, rather
   * than trusting the driver's hydration type outright — the same stance
   * `result-actors.service.ts:377-384` takes for `result_actors_id` (a `bigint` column, same driver
   * hazard). `null`/`undefined` stay `null` — never coerced to `0` (DD-2's null contract) — and `0`
   * itself is a value, never treated as absent.
   */
  quantificationsView = computed<QuantificationItemData[]>(() =>
    this.body().quantifications.map(row => ({
      number:
        row.quantification_number === undefined || row.quantification_number === null
          ? null
          : Number(row.quantification_number),
      unit: row.unit ?? '',
      comments: row.description ?? ''
    }))
  );

  async getData(): Promise<void> {
    this.loading.set(true);
    this.cache.loadingCurrentResult.set(true);
    const response = await this.api.GET_InnovationUseDetails(this.cache.getCurrentNumericResultId());

    if (!response.successfulRequest) {
      // DD-11 / R-IUP-004 AC.3: hand off to ActionsService and stop — `body` is NEVER seeded with
      // an empty shape here. Doing so would make this failure indistinguishable from an empty
      // record, and the user's next save would silently wipe it.
      // REWORK (Issue 2): `errorDetail.description` is the exception class name, not a message —
      // must NOT be preferred. Order: errorDetail.errors -> top-level description -> fallback.
      this.actions.showToast({
        severity: 'error',
        summary: 'Innovation Use',
        detail: this.extractErrorMessages(response.errorDetail).join(' ') || response.description || 'Failed to load the Innovation Use section'
      });
      this.loadFailed.set(true);
      this.cache.loadingCurrentResult.set(false);
      this.loading.set(false);
      return;
    }

    this.loadFailed.set(false);
    const data = response.data ?? new GetInnovationUseDetails();
    this.body.set({
      ...data,
      // DD-10: exactly one blank actor affordance on empty load. Organizations and
      // quantifications stay empty — they are optional, and a blank row there is precisely the
      // identity-less-row `400` chunk 2 added to stop.
      actors: Array.isArray(data.actors) && data.actors.length > 0 ? data.actors : [new InnovationUseActor()],
      organizations: Array.isArray(data.organizations) ? data.organizations : [],
      quantifications: Array.isArray(data.quantifications) ? data.quantifications : []
    });
    this.cache.loadingCurrentResult.set(false);
    this.loading.set(false);
  }

  /** Only the id changes. `innovation_use_level_explanation` is never touched here — hiding the
   * textarea below level 6 must not clear it (R-IUP-006 AC.3 / c7). */
  onLevelSelected(levelId: number): void {
    this.body.update(current => ({ ...current, innovation_use_level_id: levelId }));
  }

  onActorUpdate(index: number, actor: InnovationUseActor): void {
    this.body.update(current => ({
      ...current,
      actors: current.actors.map((row, i) => (i === index ? actor : row))
    }));
  }

  /** DD-8: no `saveCurrentSection()` call. A row with no `actor_type_id` would 400 on PATCH. */
  addActor(): void {
    this.body.update(current => ({ ...current, actors: [...current.actors, new InnovationUseActor()] }));
  }

  removeActor(index: number): void {
    this.body.update(current => ({ ...current, actors: current.actors.filter((_, i) => i !== index) }));
  }

  onOrganizationUpdate(index: number, organization: InnovationUseOrganization): void {
    this.body.update(current => ({
      ...current,
      organizations: current.organizations.map((row, i) => (i === index ? organization : row))
    }));
  }

  /** DD-8: no auto-save here either — mirrors `addActor()`. */
  addOrganization(): void {
    this.body.update(current => ({ ...current, organizations: [...current.organizations, new InnovationUseOrganization()] }));
  }

  removeOrganization(index: number): void {
    this.body.update(current => ({ ...current, organizations: current.organizations.filter((_, i) => i !== index) }));
  }

  onQuantificationUpdate(index: number, value: QuantificationItemData): void {
    this.body.update(current => ({
      ...current,
      quantifications: current.quantifications.map((row, i) =>
        i === index
          ? {
              ...row,
              quantification_number: value.number ?? undefined,
              unit: value.unit,
              description: value.comments
            }
          : row
      )
    }));
  }

  addQuantification(): void {
    this.body.update(current => ({ ...current, quantifications: [...current.quantifications, new InnovationUseQuantification()] }));
  }

  removeQuantification(index: number): void {
    this.body.update(current => ({
      ...current,
      quantifications: current.quantifications.filter((_, i) => i !== index)
    }));
  }

  /**
   * §6.5 — a pure function over `body()`. Never mutates `body()` and is unit-testable without
   * rendering. Each step maps to exactly one chunk-2 `400` (§4.3):
   *
   * 1. Copy the three scalars; omit `innovation_use_level` (server-derived, §4.2). The
   *    justification is copied as-is — this page never writes an explicit `null` to it, so an
   *    untouched value is `undefined` (dropped by JSON serialization), never a present `null`
   *    key that would clear the stored column on toggle (R-IUP-006 / c7).
   * 2. `actors`: drop rows with no `actor_type_id`; per surviving row, null the fields of the
   *    mode being left and omit `total`.
   * 3. `organizations`: drop rows satisfying neither identity path. **Hazard (a), not a named
   *    criterion:** per surviving row, also null the *inactive* path's fields — symmetric with
   *    step 2. Without this, a row can carry both `institution_type_id` and `institution_id`
   *    (T-06's card deliberately never clears the abandoned path), and the server's
   *    `ResultInstitutionTypesService.removeDuplicates` keys on `institution_type_id` *before*
   *    `is_organization_known` with last-write-wins `seen.set` — so a second row sharing that
   *    type silently drops the first, `deactivateExistingRecords` deactivates what's left, and a
   *    saved row's id is left `is_active = false` on a `200`, unrecoverable.
   * 4. `quantifications`: drop rows where number, unit *and* description are all absent.
   *    **Hazard (b), not a named criterion:** "absent" for the two text fields means
   *    empty-string-or-nullish, not `== null` — `QuantificationItemComponent` emits its first
   *    `update` with `{number: null, unit: '', comments: ''}` on ingress, which this page's
   *    adapter (`onQuantificationUpdate`) writes back as `{quantification_number: undefined,
   *    unit: '', description: ''}`. Reading "absent" as `== null` would keep and send that
   *    never-touched row — exactly the blank-row `400` §4.3 claims is closed by construction.
   *    `quantification_number === 0` is deliberately treated as present (R-IUP-008 AC.5's "0 is
   *    meaningful" principle applies here too).
   * 5. Ids are never assigned here. Every id field above is a straight passthrough of whatever
   *    `body()` already carried, and `body()` only ever receives an id from a GET response for
   *    this result (`getData()`, above) or an emitted row from a card that received one as an
   *    `@Input` — no code path in this file, `InnovationUseActorItemComponent`,
   *    `InnovationUseOrganizationItemComponent`, or `QuantificationItemComponent` ever writes to
   *    `result_actors_id`, `result_institution_type_id`, or a quantification's `id` (c6 —
   *    enumerated in full in this task's completion report, not restated here as it would rot).
   */
  buildPayload(): InnovationUsePayload {
    const current = this.body();

    return {
      innovation_use_level_id: current.innovation_use_level_id,
      // REWORK hardening: `?? undefined` makes step 1's "never a present null" (c7) structural
      // rather than coincidental. The server's `findOne` can return `?? null`, and a plain object
      // spread in `getData()` would otherwise copy that literal `null` straight into `body()`.
      innovation_use_level_explanation: current.innovation_use_level_explanation ?? undefined,
      actors: current.actors.filter(row => !!row.actor_type_id).map(row => this.buildActorPayload(row)),
      organizations: current.organizations.filter(row => this.organizationIdentitySatisfied(row)).map(row => this.buildOrganizationPayload(row)),
      quantifications: current.quantifications.filter(row => !this.quantificationRowAbsent(row)).map(row => ({
        id: row.id,
        // T-11 (DD-15): the payload's declared type (`InnovationUseQuantificationPayload`, below)
        // stays `number` — the API always expects a number (DD-17) — so this narrows the widened
        // read type back down at the one point the read and write paths meet. Reverting the read
        // widening at `get-innovation-use-details.interface.ts` while keeping this narrowing makes
        // the `typeof` check compare against a type with no `string` member, which does not compile
        // (`J-17`) — that is the intended coupling between the two declarations, not an oversight.
        quantification_number: typeof row.quantification_number === 'string' ? Number(row.quantification_number) : row.quantification_number,
        unit: row.unit,
        description: row.description
      }))
    };
  }

  private buildActorPayload(row: InnovationUseActor): InnovationUseActorPayload {
    const aggregate = row.sex_age_disaggregation_not_apply;
    return {
      result_actors_id: row.result_actors_id,
      actor_type_id: row.actor_type_id,
      actor_type_custom_name: row.actor_type_custom_name,
      sex_age_disaggregation_not_apply: aggregate,
      women_youth_count: aggregate ? null : row.women_youth_count,
      women_not_youth_count: aggregate ? null : row.women_not_youth_count,
      men_youth_count: aggregate ? null : row.men_youth_count,
      men_not_youth_count: aggregate ? null : row.men_not_youth_count,
      actors_count: aggregate ? row.actors_count : null
    };
  }

  /**
   * R-IUP-013 rule / §6.5 step 3. **REWORK (Issue 1):** the spec's predicate is an OR over both
   * identity paths — drop a row only if it satisfies *neither*. The original active-path-only
   * version (`is_organization_known ? institution_id : institution_type_id`) dropped a saved,
   * id-carrying row on this reachable sequence: a GET returns
   * `{is_organization_known: false, institution_type_id: 10}`; the user ticks "Is the
   * organization known?" and picks no institution; §5.5 deliberately leaves `institution_type_id`
   * in place. The active-path-only test then saw `is_organization_known === true` and checked
   * only `institution_id` (absent) — dropping a row that still carries a live identity on the
   * other path. Silently emitting `organizations: []` triggers `deactivateExistingRecords` on
   * every organization row for this result (no early return for an empty array), turning a
   * loud, recoverable `400` into a silent deletion. The general invariant: never drop a row that
   * carries an id from the GET.
   */
  private organizationIdentitySatisfied(row: InnovationUseOrganization): boolean {
    return !!row.institution_type_id || (row.is_organization_known === true && !!row.institution_id);
  }

  /** Hazard (a): nulls the path the row is *not* using, symmetric with `buildActorPayload()`. */
  private buildOrganizationPayload(row: InnovationUseOrganization): InnovationUseOrganizationPayload {
    const known = row.is_organization_known;
    return {
      result_institution_type_id: row.result_institution_type_id,
      is_organization_known: known,
      organization_count: row.organization_count,
      institution_id: known ? row.institution_id : null,
      institution_type_id: known ? null : row.institution_type_id,
      sub_institution_type_id: known ? null : row.sub_institution_type_id,
      institution_type_custom_name: known ? null : row.institution_type_custom_name
    };
  }

  /** Hazard (b): "absent" for text fields is empty-string-or-nullish, not `== null`; `0` is a present number. */
  private quantificationRowAbsent(row: InnovationUseQuantification): boolean {
    const numberAbsent = row.quantification_number === undefined || row.quantification_number === null;
    const textAbsent = (value: string | undefined): boolean => !value || value.trim().length === 0;
    return numberAbsent && textAbsent(row.unit) && textAbsent(row.description);
  }

  private extractErrorMessages(errorDetail: ErrorResponse | undefined): string[] {
    const raw = errorDetail?.errors as unknown;
    if (!raw) return [];
    if (Array.isArray(raw)) return raw.map(entry => (typeof entry === 'string' ? entry : JSON.stringify(entry)));
    if (typeof raw === 'string') return [raw];
    return [JSON.stringify(raw)];
  }

  /**
   * §6.7 Save.
   * 1. `!isEditableStatus()` -> issue nothing (R-IUP-015 AC.3); Back/Next navigation only.
   * 2. **Third hazard, not a named criterion:** `loadFailed()` -> issue nothing either, same
   *    shape as (1). `body()` is never reset on a failed GET (DD-11), so without this guard a
   *    PATCH built from a stale, pre-failure (or default-empty) `body()` would silently write
   *    version N-1's rows onto the current version — the DD-11 destruction class arriving
   *    through a door DD-11 itself does not cover, since `getData()` has no request sequencing.
   *    **REWORK (Issue 3):** `loadFailed()` only covers the *failed-load* subset. The
   *    *stale-success* subset — a version switch's in-flight GET, where `body` still holds the
   *    previous version's rows and `loadFailed()` is `false` — is covered by `loading()` instead.
   * 2b. **T-09 (§6.6), narrowed by T-02 (bugfix/innovation-use-draft-save):** one remaining
   *    blocking client rule, same shape as (1)/(2) — issue nothing, still fall through to
   *    navigation below. `hasDuplicateActorType()` (a duplicate actor identity somewhere in the
   *    block) is invalid *data* the server rejects, not an unfinished draft, so it still blocks
   *    (DD-5, unchanged). `justificationMissing()` **no longer gates the save** — R-IUD-001: a
   *    blank-or-whitespace justification at resolved level >= 6 must save like everything else on
   *    an incomplete draft. Completeness is still required to *submit* — `innovation_use_validation`
   *    (unchanged) keeps the green check `false`, which keeps the Submit button disabled
   *    (R-IUD-002). `justificationMissing()` itself stays (DD-4): `justificationWhitespaceOnly()`
   *    (below it) composes on top of it to drive the page's own required-message block in the
   *    template. Zero actor rows trips neither guard, so an empty draft still saves (R-IUP-010
   *    AC.5 / R-IUP-014 AC.3 / c6).
   * 3. `PATCH_InnovationUseDetails(id, buildPayload())`.
   * 4. On success -> toast -> `await getData()`. That GET carries `loadingTrigger: true`, which
   *    is what turns the sidebar tick (R-IUP-016 AC.1/AC.2 / c9).
   * 5. On failure -> `ActionsService` toast + `saveErrors` (rendered inline where a message names
   *    a field this page can address — see `justificationError`).
   * 6. Navigation: `Back -> alliance-alignment`, `Next -> partners`, preserving `?version=N`,
   *    matching every sibling detail page. Runs whether or not a save was attempted or failed —
   *    mirrored from the `capacity-sharing` exemplar's unconditional post-save navigation block.
   */
  async saveData(page?: 'back' | 'next'): Promise<void> {
    this.saveErrors.set([]);

    if (this.submission.isEditableStatus() && !this.loadFailed() && !this.loading() && !this.hasDuplicateActorType()) {
      const response = await this.api.PATCH_InnovationUseDetails(this.cache.getCurrentNumericResultId(), this.buildPayload());

      if (response.successfulRequest) {
        this.actions.showToast({
          severity: 'success',
          summary: 'Innovation Use',
          detail: 'Data saved successfully'
        });
        await this.getData();
      } else {
        // REWORK (Issue 2): `errorDetail.description` is the exception class name, not a
        // message, and must NOT be preferred. Order: errorDetail.errors -> top-level description
        // -> fallback. `extractErrorMessages()` already flattens `errors`.
        const messages = this.extractErrorMessages(response.errorDetail);
        this.saveErrors.set(messages);
        this.actions.showToast({
          severity: 'error',
          summary: 'Innovation Use',
          detail: messages.join(' ') || response.description || 'Unable to save data, please try again'
        });
      }
    }

    if (page) this.navigateTo(page);
  }

  /**
   * R-IUP-021 AC.3/AC.4 · DD-16: copies the sidebar's navigation *contract* — same commands shape,
   * same `version`/`from` forwarding rule as `ResultSidebarComponent.navigateTo()` — rather than
   * calling that private method on a sibling component. Never a document `href`: the R-IUP-021
   * scenario forbids one, because a full-page navigation here would full-page-reload the SPA and
   * drop the in-memory `body()` this page holds (§5.8). Public so the template's `(click)` binding
   * can reach it.
   *
   * **Bug fix (T-13 human gate, post-e508eeea):** the id is read from `cache.currentResultId()` —
   * the same source this component's own `navigateTo()` (below) already uses — never from
   * `route.snapshot.paramMap`. `result/:id` is this component's PARENT route (`innovation-use-details`
   * is a child of it, app.routes.ts); `paramsInheritanceStrategy` defaults to `'emptyOnly'`
   * (app.config.ts never overrides it), so a child route's own `paramMap` does not inherit the
   * parent's `:id` and `.get('id')` returns `null` here, silently. `ResultSidebarComponent
   * .navigateTo()` reads `paramMap.get('id')` successfully only because it is declared *at*
   * `result/:id` (result.component.html), not below it — identical code, different tree depth.
   * `cache.currentResultId()` is unaffected by tree depth: it is set once, from the real route
   * param, by `ResultComponent`'s own constructor effect, at the `result/:id` level. It is also
   * `WritableSignal<string | number>` and carries a platform-coded id (e.g. `STAR-13232`) verbatim
   * when the URL has one (`ResultComponent.getCurrentResultIdentifier`) — `cache
   * .getCurrentNumericResultId()`/`getCurrentPlatformCode()` must NOT be used here, as either would
   * silently truncate that id to its numeric tail, producing a navigation to a different URL form
   * than every other page in the app.
   */
  goToEvidence(): void {
    const id = this.cache.currentResultId();
    const queryParamMap = this.route.snapshot.queryParamMap;
    const version = queryParamMap.get('version');
    const from = queryParamMap.get('from');

    const queryParams: Record<string, string> = {};
    if (version) {
      queryParams['version'] = version;
    }
    if (from === RESULT_ENTRY_SOURCE_VALUE_RESULTS_CENTER || from === RESULT_ENTRY_SOURCE_VALUE_HOME) {
      queryParams[RESULT_ENTRY_SOURCE_QUERY] = from;
    }

    this.router.navigate(['/result', id, 'evidence'], { queryParams });
  }

  private navigateTo(page: 'back' | 'next'): void {
    const version = this.route.snapshot.queryParamMap.get('version');
    const queryParams = version ? { version } : undefined;
    const path = page === 'next' ? 'partners' : 'alliance-alignment';

    this.router.navigate(['result', this.cache.currentResultId(), path], {
      queryParams,
      replaceUrl: true
    });
  }
}
