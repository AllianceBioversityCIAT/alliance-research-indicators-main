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

/** §6.4 / R-IUP-006 AC.4: the justification is gated on the resolved `level`, never on the id. */
const JUSTIFICATION_MIN_LEVEL = 6;

/**
 * Page shell for the Innovation Use details section (indicator 6). Shape follows
 * `capacity-sharing` — `app-page-wrapper` -> `app-form-header` -> four titled cards ->
 * `app-navigation-buttons` (DD-1). No accordion.
 *
 * Scope (T-07): layout, the four UI states (loading/empty/error/success), and the conditional
 * justification. `buildPayload()` + the PATCH save flow are T-08's scope — `navigate()` here only
 * handles §6.7 step 6 (Back/Next), never a PATCH.
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

  /**
   * DD-11 — distinct from an empty `body`, and never inferred from its shape. A failed GET sets
   * this and leaves `body` completely untouched, so the error surface can never be confused with
   * the empty-record state (R-IUP-004 AC.3 / c4).
   */
  loadFailed = signal(false);

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
   * Adapts the server shape (`id`, `quantification_number`, `unit`, `description`) to the shared
   * card's shape (`number`, `unit`, `comments`) at this boundary, merged by array index so `id`
   * round-trips without `QuantificationItemComponent` knowing it exists (§5.6).
   */
  quantificationsView = computed<QuantificationItemData[]>(() =>
    this.body().quantifications.map(row => ({
      number: row.quantification_number ?? null,
      unit: row.unit ?? '',
      comments: row.description ?? ''
    }))
  );

  async getData(): Promise<void> {
    this.cache.loadingCurrentResult.set(true);
    const response = await this.api.GET_InnovationUseDetails(this.cache.getCurrentNumericResultId());

    if (!response.successfulRequest) {
      // DD-11 / R-IUP-004 AC.3: hand off to ActionsService and stop — `body` is NEVER seeded with
      // an empty shape here. Doing so would make this failure indistinguishable from an empty
      // record, and the user's next save would silently wipe it.
      this.actions.showToast({
        severity: 'error',
        summary: 'Innovation Use',
        detail: response.errorDetail?.description || response.description || 'Failed to load the Innovation Use section'
      });
      this.loadFailed.set(true);
      this.cache.loadingCurrentResult.set(false);
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

  /** §6.7 step 6 only. `buildPayload()` + the PATCH-then-navigate flow (steps 1-5) is T-08's scope. */
  navigate(page: 'next' | 'back'): void {
    const version = this.route.snapshot.queryParamMap.get('version');
    const queryParams = version ? { version } : undefined;
    const path = page === 'next' ? 'partners' : 'alliance-alignment';

    this.router.navigate(['result', this.cache.currentResultId(), path], {
      queryParams,
      replaceUrl: true
    });
  }
}
