import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { filter } from 'rxjs/operators';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { RadioButtonModule } from 'primeng/radiobutton';
import { TooltipModule } from 'primeng/tooltip';
import { DialogModule } from 'primeng/dialog';
import { SkeletonModule } from 'primeng/skeleton';
import { BilateralService } from '@shared/services/bilateral.service';
import { CacheService } from '@shared/services/cache/cache.service';
import { ActionsService } from '@shared/services/actions.service';
import { ClarityService } from '@shared/services/clarity.service';
import { WebsocketService } from '@sockets/websocket.service';
import { FormHeaderComponent } from '@shared/components/form-header/form-header.component';
import { NavigationButtonsComponent } from '@shared/components/navigation-buttons/navigation-buttons.component';
import { CustomTagComponent } from '@shared/components/custom-tag/custom-tag.component';
import { SpTocAlignmentBlockComponent } from './components/sp-toc-alignment-block/sp-toc-alignment-block.component';
import {
  AlignmentChangedEvent,
  AlignmentResponse,
  PoolFundingScienceProgram,
  SavedTocAlignment,
  SpAlignmentDraft,
  TocLevel,
  UpdatePoolFundingAlignmentDto
} from '@interfaces/bilateral/pool-funding-alignment.interface';

interface SelectedScienceProgram {
  official_code: string;
  name?: string;
  category?: string | null;
  color?: string | null;
  code?: string;
  allocation?: number | string | null;
  icon_key?: string | null;
}

interface AlignmentFormData {
  has_contribution: boolean | null;
  selected_sps: SelectedScienceProgram[];
  // @sdd-spec docs/specs/bilateral/primary-contributing-sp — T-14 / R-BIL-127
  // One field, not a per-SP flag — two SPs cannot both be Primary if there is
  // only one slot. `null` = no Primary chosen (blocks save while
  // has_contribution === true, R-BIL-127 AC.3).
  primary_sp_code: string | null;
  // T-BIL-TM2-04 — per-SP ToC drafts, keyed by sp_code, order = SP selection order.
  toc_drafts: SpAlignmentDraft[];
}

// @sdd-spec docs/specs/bilateral/primary-contributing-sp — T-15 / R-BIL-129, design.md §6.4
// A saved ToC row rendered read-only for one of two reasons (or both, never
// twice — see readOnlyTocSummaries below): it belongs to an SP that is no
// longer Primary (`isOrphaned`), or its `toc_result_id` no longer resolves in
// the live catalog (`isStale`, the pre-existing AC-08.4 concept). Module-private
// — not part of any exported surface, so it cannot widen a consumer's type.
interface ReadOnlyTocSummary {
  alignment: SavedTocAlignment;
  isOrphaned: boolean;
  isStale: boolean;
}

@Component({
  selector: 'app-pool-funding-alignment',
  imports: [
    FormsModule,
    RadioButtonModule,
    TooltipModule,
    DialogModule,
    SkeletonModule,
    FormHeaderComponent,
    NavigationButtonsComponent,
    CustomTagComponent,
    SpTocAlignmentBlockComponent
  ],
  templateUrl: './pool-funding-alignment.component.html',
  styleUrl: './pool-funding-alignment.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export default class PoolFundingAlignmentComponent {
  readonly bilateralService = inject(BilateralService);
  readonly showHelpModal = signal<boolean>(false);
  private readonly cache = inject(CacheService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly actions = inject(ActionsService);
  // Defensive: if WebsocketService can't be constructed (e.g., SocketIoModule
  // not provided in this environment), the alignment tab should still work —
  // socket reconcile silently degrades to "manual refresh" UX.
  // The shape check matters: after a failed factory, Angular's prod-mode DI
  // (ngDevMode-gated CIRCULAR guard in `hydrate`) returns the poisoned record's
  // `{}` sentinel on the NEXT inject instead of throwing, so `catch` alone
  // doesn't cover re-entry into this route within the same SPA session.
  private readonly websocketService: WebsocketService | null = (() => {
    try {
      const service = inject(WebsocketService);
      return typeof service?.listen === 'function' ? service : null;
    } catch {
      return null;
    }
  })();
  // Same defensive pattern for ClarityService — telemetry must never block UX.
  private readonly clarityService: ClarityService | null = (() => {
    try { return inject(ClarityService); } catch { return null; }
  })();
  private readonly destroyRef = inject(DestroyRef);

  readonly loadFailed = signal(false);
  readonly inlineErrors = signal<Record<string, string> | null>(null);
  // REQ-BIL-ASR-03 — SP codes rejected by the last PATCH 400 (`unknown_sp_codes`).
  // Drives both the inline message (via inlineErrors['sp_codes']) and the per-chip
  // error highlight. Cleared on any selection change (AC-03.4).
  readonly rejectedSpCodes = signal<string[]>([]);
  // AC-08.2 — per-SP ToC alignment 400 errors, keyed sp_code → { field|'_': message }.
  // Each rendered block receives its slice via blockErrorsForSp(); cleared per-SP on
  // any draft change for that SP.
  readonly blockErrors = signal<Record<string, Record<string, string>>>({});
  // AC-08.3/09.1 — set when a 409 `toc_mapping_version_locked` lands; renders the
  // version-gate notice and disables the ToC blocks even before the catalog refetch
  // resolves `version_locked`.
  readonly versionLockedFrom409 = signal(false);

  readonly SYNCED_BANNER = 'This result has been pushed to PRMS. Alignment can no longer be edited from STAR.';
  readonly READ_ONLY_BANNER = "You don't have permission to edit this section.";
  readonly SYNCED_BADGE_LABEL = 'Synced — read only';
  readonly SYNCED_BADGE_ARIA_LABEL = 'Pool Funding Alignment is synced and read only';
  // REQ-BIL-ASR-02 — PRMS-sourced read-only differentiation. The result is owned
  // by PRMS (is_read_only && !is_synced_to_prms), distinct from the synced cause.
  readonly PRMS_SOURCED_BADGE_LABEL = 'Owned by PRMS';
  readonly PRMS_SOURCED_BADGE_ARIA_LABEL = 'Pool Funding Alignment is owned by PRMS and read only';
  readonly PRMS_SOURCED_BANNER = 'This result is owned by PRMS. Bilateral alignment is read-only in STAR.';
  // Locked backend 409 description that signals the PRMS-sourced read-only cause.
  readonly PRMS_SOURCED_409_DESCRIPTION = 'Result is PRMS-sourced; bilateral alignment is read-only in STAR';
  readonly INFO_BANNER =
    'Align this result with a Science Program and specify its contribution to the Theory of Change (Outputs, Outcomes) and related indicators.';
  readonly CONTRIBUTION_QUESTION = 'Does this result contribute to a Science Program or Accelerator?';
  readonly SP_PICKER_LABEL = 'Select the Science Program(s) this is related to';
  // @sdd-spec docs/specs/bilateral/primary-contributing-sp — T-14 / R-BIL-127
  // A separate, single-choice control over the already-selected set (D-C2-7) —
  // not a second multiselect, not a mode toggle on the existing picker (design.md §6.3).
  readonly PRIMARY_SP_LABEL = 'Select the Primary Science Program';
  // AC.3 — inline message naming what is missing; computed client-side (primaryRequiredMessage
  // below) so canSave() never relies on the server 400 for this.
  readonly PRIMARY_SP_REQUIRED_MESSAGE = 'Select a Primary Science Program before saving.';
  // QA 2026-08-25 (Bug 2) — canSave()'s `hasMinimalSelection` clause blocks save
  // on has_contribution === true with zero SPs, and `primaryRequiredMessage`
  // returns null in exactly that case, so Save went grey with no explanation and
  // no route out. Names both ways out, since answering "No" is as valid as
  // picking an SP.
  readonly SP_REQUIRED_MESSAGE =
    "Select at least one Science Program, or answer 'No' if this result does not contribute to a Science Program.";
  readonly PRIMARY_ROLE_LABEL = 'Primary';
  readonly CONTRIBUTING_ROLE_LABEL = 'Contributing';
  readonly UNMAPPED_SP_MESSAGE =
    "This result isn't linked to a CLARISA project yet. Contact the bilateral operations team to register the project mapping.";
  readonly STALE_SP_MESSAGE =
    'The linked CLARISA project could not be found in the current feed. Contact the bilateral operations team to reconcile the project mapping.';
  readonly NO_SP_DEFINED_MESSAGE = 'The linked CLARISA project has no Science Programs available for alignment.';
  readonly PENDING_SP_TAG = 'Pending';
  // REQ-BIL-ASR-03 — AC-03.3 inline message naming the rejected SP codes.
  readonly REJECTED_SP_MESSAGE_PREFIX = 'These Science Programs are no longer valid for this result: ';
  readonly REJECTED_SP_MESSAGE_SUFFIX = '. Remove them and save again.';
  readonly HLO_SECTION_LABEL = 'Map Theory of Change results and indicators';
  // AC-09.1 — live-version gate notice (2026-only ToC mapping).
  readonly VERSION_LOCKED_BANNER =
    'Theory of Change alignment is only editable on the live 2026 version of this result. The alignment below is read-only.';
  // AC-08.4 — stale snapshot warning tag (display-only).
  readonly STALE_SNAPSHOT_TAG = 'Stale — catalog item no longer available';
  // @sdd-spec docs/specs/bilateral/primary-contributing-sp — T-15 / R-BIL-129
  // Read-only orphan tag (display-only) — reuses the stale tag's `.pf-stale-tag`
  // visual treatment verbatim (D-C2-10); only the copy differs.
  readonly ORPHANED_TOC_TAG = 'Not the current Primary — read-only';
  // The tag above states WHAT the row is; this states WHY it is still on screen.
  // R-BIL-129's own rationale — "data that is still stored — and still bound for
  // PRMS — does not vanish from the screen" — was never surfaced in the UI, and
  // three independent reviewers (QA Bug 1a, twice, and a product review
  // 2026-08-25) each read the retained row as a defect. Copy only: the row, its
  // retention, and OQ-3 are all untouched.
  readonly ORPHANED_TOC_EXPLANATION =
    'Retained for PRMS. This Science Program is submitted as Contributing, without Theory of Change mapping.';
  // @sdd-spec docs/specs/bilateral/primary-contributing-sp — T-16, applying T-15's
  // Reviewer finding (design.md §12.2, superseded-string record kept there). The
  // row this labels holds an explicit saved "No" answer — data that IS stored —
  // so copy reading "recorded" as an absence worked against R-BIL-129 (stored
  // data must not vanish from the screen on a role change) and was
  // indistinguishable from a genuinely unanswered row.
  readonly NO_TOC_ALIGNMENT_MESSAGE = 'Not aligned with the Theory of Change.';
  // REQ-BIL-TM2-10 / D-6a — destructive SP-deselect confirmation copy (OQ-5 default).
  readonly DESELECT_CONFIRM_SUMMARY = 'Remove Science Program?';
  readonly DESELECT_CONFIRM_DETAIL =
    'This Science Program has a Theory of Change alignment. Removing it will discard that alignment. Do you want to continue?';

  readonly alignment = this.bilateralService.currentAlignment;
  readonly loading = this.bilateralService.loadingAlignment;
  readonly saving = this.bilateralService.savingAlignment;
  readonly editable = this.bilateralService.editable;

  readonly isReadOnly = computed(() => !!this.alignment()?.is_read_only);
  readonly eligible = computed(() => !!this.alignment()?.eligible);

  // REQ-BIL-ASR-02 — distinguish WHY the section is read-only so the badge + banner
  // copy can differ while inputs stay disabled identically (AC-02.5). `is_read_only`
  // is now a union (R-BIL-071): synced-to-PRMS OR PRMS-sourced.
  readonly isSyncedToPrms = computed(() => !!this.alignment()?.is_synced_to_prms);
  readonly readOnlyCause = computed<'synced' | 'prms-sourced' | 'permission' | null>(() => {
    if (this.isReadOnly()) return this.isSyncedToPrms() ? 'synced' : 'prms-sourced';
    if (!this.editable()) return 'permission';
    return null;
  });

  // Per-result SP picker source + empty-state discriminators (REQ-BIL-ASR-01, R-PSP-004).
  readonly sciencePrograms = this.bilateralService.sciencePrograms;
  readonly mappingStatus = this.bilateralService.mappingStatus;
  readonly loadingSciencePrograms = this.bilateralService.loadingSciencePrograms;
  // AC-01.2 — unmapped: picker empty + contact-ops message; no 13-SP fallback.
  readonly isUnmapped = computed(() => this.mappingStatus() === 'unmapped');
  // R-PSP-004 / D-PSP-5 — stale: active mapping exists but CLARISA project unresolvable in feed.
  readonly isStale = computed(() => this.mappingStatus() === 'stale');
  // AC-01.3 — mapped but the CLARISA project carries no SPs (distinct message).
  readonly hasNoSciencePrograms = computed(() => this.mappingStatus() === 'mapped' && this.sciencePrograms().length === 0);
  // R-PFU-001 / DD-1 — Single-SP project detection for streamlined auto-selection & card view
  readonly isSingleSp = computed(() => this.mappingStatus() === 'mapped' && this.sciencePrograms().length === 1);
  readonly singleSp = computed<PoolFundingScienceProgram | null>(() => (this.isSingleSp() ? this.sciencePrograms()[0] : null));
  // Single named gate for the picker (used directly in the template). Renders only
  // once the per-result source has resolved (mappingStatus non-null) AND the
  // project is mapped with ≥1 SP and not stale. The null guard prevents an empty-picker flash
  // while getSciencePrograms is still in flight.
  readonly showSpPicker = computed(
    () => this.mappingStatus() !== null && !this.isUnmapped() && !this.isStale() && !this.hasNoSciencePrograms()
  );

  readonly showHloSection = computed(() => {
    const form = this.formData();
    return form.has_contribution === true && form.selected_sps.length >= 1;
  });

  // Renders the HLO shell while the ToC catalog is in flight or failed, and once
  // allowed_levels are known — avoids hiding the whole section during slow loads.
  readonly hloSectionVisible = computed(() => {
    if (this.loadingTocCatalog() && !this.tocCatalog()) return true;
    if (this.tocCatalogError() && !this.tocCatalog()) return true;
    return this.showTocBlocks();
  });

  readonly HLO_CATALOG_LOADING_MESSAGE = 'Loading the Theory of Change catalog…';
  readonly HLO_CATALOG_ERROR_MESSAGE = "We couldn't load the Theory of Change catalog. Try again.";

  // T-BIL-TM2-04 — ToC catalog signals (T-02 seams) surfaced for the template.
  readonly loadingTocCatalog = this.bilateralService.loadingTocCatalog;
  readonly tocCatalogError = this.bilateralService.tocCatalogError;
  readonly tocCatalog = this.bilateralService.tocCatalog;

  // AC-04.3 — server-owned allowed levels; [] ⇒ no ToC blocks render.
  readonly allowedLevels = computed<TocLevel[]>(() => this.tocCatalog()?.allowed_levels ?? []);

  // T-BIL-ITG-03 — the result's backend-owned type key from the catalog envelope;
  // feeds the per-SP blocks' indicator-type guidance (null until the catalog loads
  // ⇒ guidance stays disabled, AC-05.1).
  // @sdd-spec docs/specs/bilateral-module/toc-indicator-type-guidance
  readonly resultType = computed(() => this.tocCatalog()?.result_type ?? null);
  // Gate the @for blocks: only render the per-SP ToC question + cascade when the
  // backend offers at least one level for this result type (AC-04.3).
  readonly showTocBlocks = computed(() => this.allowedLevels().length > 0);

  // AC-09.1 — version-locked when the catalog flags it OR a 409 said so.
  readonly versionLocked = computed(() => !!this.tocCatalog()?.version_locked || this.versionLockedFrom409());

  // Catalog async state machine for the per-SP blocks (AC-11.1/11.2).
  readonly catalogState = computed<'loading' | 'ready' | 'error'>(() => {
    if (this.loadingTocCatalog()) return 'loading';
    if (this.tocCatalogError()) return 'error';
    return 'ready';
  });

  // Blocks are disabled when the section is read-only OR the live version is locked.
  readonly blocksDisabled = computed(() => !this.editable() || this.isReadOnly() || this.versionLocked());

  readonly formData = signal<AlignmentFormData>({
    has_contribution: null,
    selected_sps: [],
    primary_sp_code: null,
    toc_drafts: []
  });

  // @sdd-spec docs/specs/bilateral/primary-contributing-sp — T-14 / R-BIL-127, design.md §6.1
  // Derived signals over the Primary designation. `contributingSps` is the
  // selected set minus the Primary (spec-required derivation; not currently
  // rendered directly — every selected SP is shown once in the Primary
  // selector, with role read off `isPrimary`).
  readonly primarySpCode = computed(() => this.formData().primary_sp_code);

  isPrimary(code: string): boolean {
    return this.primarySpCode() === code;
  }

  readonly contributingSps = computed(() => {
    const primary = this.primarySpCode();
    return this.formData().selected_sps.filter(sp => (sp.official_code || sp.code) !== primary);
  });

  // @sdd-spec docs/specs/bilateral/primary-contributing-sp — T-15 / R-BIL-128 AC.1/AC.4/AC.5
  // The ONLY SP the ToC block renders for. `null` when no Primary is chosen
  // (AC.5 — no block renders) or the Primary isn't among the currently
  // selected SPs (defensive; `syncDraftsToSelection` already clears
  // `primary_sp_code` when its SP is deselected, R-BIL-127 AC.4). Single
  // source of truth for AC.1 ("exactly one block, for the Primary") and AC.4
  // ("changing the Primary moves the rendered block") — both are automatic
  // consequences of this one computed changing identity, not two behaviors
  // to keep in sync.
  readonly primarySelectedSp = computed<SelectedScienceProgram | null>(() => {
    const primary = this.primarySpCode();
    if (!primary) return null;
    return this.formData().selected_sps.find(sp => (sp.official_code || sp.code) === primary) ?? null;
  });

  // AC.5 — read-only and version-locked states disable the Primary control
  // alongside the existing picker (which itself disables on !editable() ||
  // isReadOnly()); version-locked is an ADDITIONAL trigger specific to the
  // Primary control (R-BIL-127 AC.5), since Primary feeds the ToC block
  // gating (T-15) that is itself frozen during a version lock.
  readonly primaryControlDisabled = computed(
    () => !this.editable() || this.isReadOnly() || this.versionLocked()
  );

  // QA 2026-08-25 (Bug 2) — sibling of `primaryRequiredMessage` for the step
  // before it: nothing selected at all. Same read-only/version-lock suppression,
  // for the same reason (do not demand an action a disabled control forbids).
  readonly spRequiredMessage = computed<string | null>(() => {
    if (!this.editable() || this.isReadOnly() || this.versionLocked()) return null;
    const form = this.formData();
    if (form.has_contribution !== true) return null;
    return form.selected_sps.length === 0 ? this.SP_REQUIRED_MESSAGE : null;
  });

  // AC.3 — inline message naming what is missing, computed client-side so
  // canSave() never relies on the server 400 for it (design.md §6.1). Shown
  // whenever the Primary selector is visible, interactive, and unanswered —
  // including on load for a legacy alignment with selected SPs but no role
  // yet (R-BIL-126).
  //
  // @sdd-spec docs/specs/bilateral/primary-contributing-sp — T-15, T-14 review ADVISORY 2
  // (promoted to in-scope). Also gated on !versionLocked(): `primaryControlDisabled`
  // already disables the Primary radio group under a version lock (matching
  // `blocksDisabled`'s formula), but this message ignored that and kept demanding
  // an action the disabled control forbids — and since deselecting the SP holding
  // Primary is still possible via the (not version-lock-disabled) SP picker while
  // the radio group is frozen, the Primary became unrecoverable except by reload.
  // Minimal fix: suppress the message. Do NOT also disable the SP picker under
  // version-lock — that changes shipped, tested behaviour outside this task.
  // Spec ambiguity this closes: R-BIL-127 AC.5 mandates the version-locked
  // DISABLE on "the Primary control... alongside the existing picker", but the
  // existing picker itself has no version-lock disable — only
  // `!editable() || isReadOnly()` — so "alongside" and "matching" are not the
  // same claim, and AC.5's Details line reads as the latter.
  readonly primaryRequiredMessage = computed<string | null>(() => {
    if (!this.editable() || this.isReadOnly() || this.versionLocked()) return null;
    const form = this.formData();
    if (form.has_contribution !== true || form.selected_sps.length === 0) return null;
    return form.primary_sp_code ? null : this.PRIMARY_SP_REQUIRED_MESSAGE;
  });

  // AR.1 — alignment edit is NOT gated by result_status.
  readonly canSave = computed(() => {
    const form = this.formData();
    const hasMinimalSelection = form.has_contribution === false || form.selected_sps.length >= 1;
    if (!this.editable() || this.isReadOnly() || !this.isDirty() || !hasMinimalSelection) return false;
    // R-BIL-127 AC.3 — with has_contribution === true, a Primary must be chosen.
    if (form.has_contribution === true && !form.primary_sp_code) return false;
    // Block save until the RENDERED block is answered: the per-SP ToC question
    // is required (*), so unanswered (null) blocks too, as does a "Yes" below the
    // Level + HLO floor (R-BIL-112 AC.1-4). A "Yes" carrying Level + HLO is
    // saveable even without an indicator (the completeness half of this gate was
    // reverted — D-C1-4). No blocks render when allowed_levels is empty
    // (AC-04.3), so this gate is skipped then.
    // @sdd-spec docs/specs/bilateral/toc-optional-mapping/design.md §8 (D-C1-4 — the archived
    // save-gating-ux spec this line used to cite never existed under any name; see Finding 1)
    //
    // @sdd-spec docs/specs/bilateral/primary-contributing-sp — T-15 / R-BIL-128 AC.2
    // Narrowed from "every selected SP" to "the Primary's draft only" — only one
    // block is rendered now (T-15), and a Contributing SP without a ToC answer
    // must not block save. `form.primary_sp_code` is guaranteed set here: the
    // `has_contribution === true && !form.primary_sp_code` clause above already
    // returned false otherwise.
    if (this.showHloSection() && this.showTocBlocks() && !this.versionLocked() && form.primary_sp_code) {
      const draft = form.toc_drafts.find(d => d.sp_code === form.primary_sp_code);
      if (!draft || !this.isDraftSaveable(draft)) return false;
    }
    return true;
  });

  readonly isDirty = computed(() => {
    const alignment = this.alignment();
    if (!alignment) return false;
    const server = this.snapshotFromServer(alignment);
    const form = this.formData();
    if (server.has_contribution !== form.has_contribution) return true;
    if (!this.sameCodeSet(server.selected_sps.map(sp => sp.official_code), form.selected_sps.map(sp => sp.official_code))) {
      return true;
    }
    if (server.primary_sp_code !== form.primary_sp_code) return true;
    return !this.sameDraftSet(server.toc_drafts, form.toc_drafts);
  });

  readonly resultCode = computed(() => {
    const routeId = this.route.snapshot.paramMap.get('id');
    if (routeId) return routeId;
    const numeric = this.cache.getCurrentNumericResultId();
    return numeric ? String(numeric) : '';
  });

  // AC-08.4 — saved alignments that must render read-only from their snapshot:
  // explicitly stale, or whose toc_result_id no longer resolves in the live catalog.
  readonly staleSnapshots = computed<SavedTocAlignment[]>(() => {
    const saved = this.alignment()?.toc_alignments ?? [];
    return saved.filter(a => a.aligns_with_toc && this.isStaleSaved(a));
  });

  // @sdd-spec docs/specs/bilateral/primary-contributing-sp — T-15 / R-BIL-129, design.md §6.1/§6.4
  // Saved ACTIVE ToC rows whose sp_code is not the current Primary (R-BIL-125
  // retains them; the read-back's ToC filter is role-agnostic — design.md §5.3 —
  // so `toc_alignments` already carries every active row here regardless of
  // role). `this.alignment()?.toc_alignments` IS the active set: a deactivated
  // row is excluded server-side, never returned at all. Deliberately does not
  // filter on `aligns_with_toc` — an orphaned "No" row is still retained data
  // that must not silently vanish (R-BIL-129's rationale draws no distinction).
  readonly orphanedTocAlignments = computed<SavedTocAlignment[]>(() => {
    const primary = this.primarySpCode();
    const saved = this.alignment()?.toc_alignments ?? [];
    return saved.filter(a => a.sp_code !== primary);
  });

  // @sdd-spec docs/specs/bilateral/primary-contributing-sp — T-15 / R-BIL-129 AC.5, design.md §6.4
  // "A row that is both orphaned and stale renders ONCE" — unioned by sp_code
  // through a Map, never concatenated. This makes the duplicate structurally
  // UNREPRESENTABLE, not merely unlikely: a Map key can hold only one entry, so
  // a second write for the same sp_code (from the stale pass) merges the
  // `isStale` flag onto the existing entry instead of appending a sibling
  // element the template would then render a second time. The same reasoning
  // T-14 used for `primary_sp_code` being one field rather than a per-SP flag.
  // A `concat`-based implementation would only fail AC.5's discriminating
  // fixture (a row genuinely both orphaned AND stale); on any fixture that is
  // only one of the two, concat and union are indistinguishable — which is
  // exactly `tasks.md`'s stated disqualifier, and exactly why this is a Map,
  // not a list append.
  //
  // QA 2026-08-25 (Bug 1c) — BOTH source computeds read the SERVER snapshot
  // (`alignment()?.toc_alignments`) and neither consults `formData()`, so a row
  // whose SP the user has just DESELECTED kept rendering its read-only card
  // until the next save. That contradicted the removal modal's promise
  // ("Removing it will discard that alignment") and showed a card for an SP
  // that no longer had a chip on screen.
  //
  // R-BIL-129 modelled only two reasons for a read-only row — not the current
  // Primary, or stale — and "its SP is no longer selected" is a THIRD state it
  // never considered. The selection gate lives here, at the single union point,
  // rather than in each source computed: one filter cannot drift out of sync
  // with itself, and `staleSnapshots` keeps its existing meaning for its own
  // pinned assertion.
  //
  // This does NOT touch R-BIL-125/R-BIL-129's retain-on-DEMOTION behaviour
  // (OQ-3, owned by the BA): a demoted SP is still selected, so it still
  // renders. Only a deselected SP's card is withdrawn — and the server
  // deactivates exactly those rows on the next PATCH (R-BIL-125 AC.3), so the
  // screen now leads that cascade instead of contradicting it.
  readonly readOnlyTocSummaries = computed<ReadOnlyTocSummary[]>(() => {
    const selected = new Set(this.formData().selected_sps.map(sp => sp.official_code || sp.code));
    const bySp = new Map<string, ReadOnlyTocSummary>();
    for (const row of this.orphanedTocAlignments()) {
      bySp.set(row.sp_code, { alignment: row, isOrphaned: true, isStale: false });
    }
    for (const row of this.staleSnapshots()) {
      const existing = bySp.get(row.sp_code);
      bySp.set(row.sp_code, existing ? { ...existing, isStale: true } : { alignment: row, isOrphaned: false, isStale: true });
    }
    return [...bySp.values()].filter(row => selected.has(row.alignment.sp_code));
  });

  constructor() {
    const resultCode = this.resultCode();
    void this.bilateralService.getAlignment(resultCode).then(alignment => {
      if (!alignment) {
        this.loadFailed.set(true);
        return;
      }
      if (alignment.eligible === false || this.cache.currentMetadata()?.indicator_id === 5) {
        void this.router.navigate(['/result', resultCode, 'general-information'], { replaceUrl: true });
        return;
      }
      this.seedFromServer(alignment);
      // Picker options are per-result (REQ-BIL-ASR-01): only fetch once the
      // alignment confirms the result is eligible. The picker endpoint is only
      // reachable on eligible results (pitfall 4).
      void this.bilateralService.getSciencePrograms(resultCode);
      // §8 — section load = 3 GETs (alignment, science-programs, catalog).
      void this.bilateralService.getTocCatalog(resultCode);
      this.clarityService?.trackEvent('bilateral.alignment.viewed', {
        result_code: alignment.result_code,
        eligible: alignment.eligible,
        has_contribution: alignment.has_contribution,
        is_read_only: alignment.is_read_only
      });
    });

    this.websocketService
      ?.listen('result.pool-funding-alignment.changed')
      .pipe(
        filter((evt): evt is AlignmentChangedEvent =>
          !!evt && typeof evt === 'object' && (evt as AlignmentChangedEvent).result_code === this.resultCode()
        ),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe(() => this.handleRemoteChange());
  }

  handleRemoteChange(): void {
    if (!this.isDirty()) {
      void this.bilateralService.getAlignment(this.resultCode()).then(alignment => {
        if (alignment) this.seedFromServer(alignment);
      });
      return;
    }
    this.actions.showToast({
      severity: 'info',
      summary: 'Alignment updated',
      detail: 'Another user updated this alignment. Refresh to see the latest.'
    });
  }

  seedFromServer(alignment: AlignmentResponse): void {
    this.formData.set(this.snapshotFromServer(alignment));
  }

  onContributionChange(value: boolean | null): void {
    const sps = this.sciencePrograms();
    const isSingleSp = this.isSingleSp();

    this.formData.update(form => {
      if (value === true && isSingleSp && sps.length === 1) {
        const sp = sps[0];
        const spCode = sp.code;
        const selected: SelectedScienceProgram = {
          code: sp.code,
          name: sp.name,
          official_code: sp.code,
          allocation: sp.allocation,
          color: sp.color,
          icon_key: sp.icon_key
        };
        return {
          ...form,
          has_contribution: true,
          selected_sps: [selected],
          primary_sp_code: spCode,
          toc_drafts: [this.emptyDraft(spCode)]
        };
      }

      return {
        ...form,
        has_contribution: value,
        selected_sps: value === false ? [] : form.selected_sps,
        // R-BIL-127 — no selected set, no Primary; ignored server-side anyway
        // when has_contribution is false (R-BIL-014), but the form must not
        // carry a stale value into a later "Yes" flip.
        primary_sp_code: value === false ? null : form.primary_sp_code,
        toc_drafts: value === false ? [] : form.toc_drafts
      };
    });

    if (value === true) {
      const errors = this.inlineErrors();
      if (errors?.['has_contribution']) {
        const rest = { ...errors };
        delete rest['has_contribution'];
        this.inlineErrors.set(Object.keys(rest).length > 0 ? rest : null);
      }
    } else if (value === false) {
      // Flipping to "No" clears the selection, so any rejected-code state is stale.
      this.clearRejectedSpError();
      this.blockErrors.set({});
    }
  }

  // R-BIL-127 AC.1/AC.2 — a single-choice control over the already-selected
  // set. Choosing a new value structurally demotes the previous one: there is
  // only one `primary_sp_code` field, so "two SPs both Primary" is
  // unrepresentable (mirrors the backend's D-C2-1 reasoning).
  onPrimaryChange(code: string): void {
    this.formData.update(form => ({ ...form, primary_sp_code: code }));
    const errors = this.inlineErrors();
    if (errors?.['primary_sp_code']) {
      const rest = { ...errors };
      delete rest['primary_sp_code'];
      this.inlineErrors.set(Object.keys(rest).length > 0 ? rest : null);
    }
  }

  // R-PFU-002 / DD-2 — Multi-SP Card Selection & Inline Primary Toggle
  isSelectedSp(code: string): boolean {
    return this.formData().selected_sps.some(s => (s.official_code || s.code) === code);
  }

  toggleSp(sp: PoolFundingScienceProgram): void {
    if (!this.editable() || this.isReadOnly()) return;
    const spCode = sp.code;
    const isSelected = this.isSelectedSp(spCode);

    if (isSelected) {
      if (this.hasMeaningfulAlignment(spCode)) {
        this.confirmDestructiveRemoval(spCode);
        return;
      }
      this.formData.update(form => {
        const remaining = form.selected_sps.filter(s => (s.official_code || s.code) !== spCode);
        let nextPrimary = form.primary_sp_code;
        if (form.primary_sp_code === spCode) {
          nextPrimary = remaining.length === 1 ? (remaining[0].official_code || remaining[0].code || null) : (remaining.length > 0 ? (remaining[0].official_code || remaining[0].code || null) : null);
        }
        return {
          ...form,
          selected_sps: remaining,
          primary_sp_code: nextPrimary,
          toc_drafts: form.toc_drafts.filter(d => d.sp_code !== spCode)
        };
      });
    } else {
      const selected: SelectedScienceProgram = {
        code: sp.code,
        name: sp.name,
        official_code: sp.code,
        allocation: sp.allocation,
        color: sp.color,
        icon_key: sp.icon_key
      };
      this.formData.update(form => {
        const newSelected = [...form.selected_sps, selected];
        const nextPrimary = form.primary_sp_code ?? spCode;
        const existingDraft = form.toc_drafts.find(d => d.sp_code === spCode);
        const newDrafts = existingDraft ? form.toc_drafts : [...form.toc_drafts, this.emptyDraft(spCode)];
        return {
          ...form,
          selected_sps: newSelected,
          primary_sp_code: nextPrimary,
          toc_drafts: newDrafts
        };
      });
    }

    this.clearRejectedSpError();
    this.ensureTocCatalogLoaded();
  }

  setPrimarySp(spCode: string, event?: Event): void {
    event?.stopPropagation();
    if (!this.editable() || this.isReadOnly()) return;
    this.onPrimaryChange(spCode);
  }

  // REQ-BIL-ASR-03 (AC-03.4) — any change to the SP selection clears the inline
  // rejection error + chip highlight so the next save attempt starts clean.
  // AC-02.2/02.3 (D-6/D-6a) — reconcile the per-SP draft array: append empty drafts
  // for newly-added SPs; for a removed SP that holds a saved/in-progress alignment,
  // re-select it and ask the house destructive-confirm before applying the removal.
  // @sdd-spec docs/specs/bilateral/toc-optional-mapping/design.md §14 OQ-C1-5 (this path
  // never existed under any prefix; see Finding 1 — the rationale survives only in comments)
  // Non-re-entrant reconcile: the multiselect emits selectEvent *inside* its own
  // formData.update() whose outer `return { ...current }` would clobber a nested
  // reconcile write. Defer reconcileDrafts to after that update settles so the
  // toc_drafts sync actually populates (REQ-BIL-SGU-01/02). clearRejectedSpError
  // stays synchronous (D-6a destructive-deselect confirm internals unchanged).
  onSpSelectionChange(): void {
    this.clearRejectedSpError();
    // Defer until MultiselectComponent's formData write settles, then reconcile
    // drafts and (re)fetch the ToC catalog if the initial section load missed it.
    queueMicrotask(() => {
      this.reconcileDrafts();
      this.ensureTocCatalogLoaded();
    });
  }

  private ensureTocCatalogLoaded(): void {
    if (this.formData().selected_sps.length === 0) return;
    if (this.tocCatalog() || this.loadingTocCatalog()) return;
    void this.bilateralService.getTocCatalog(this.resultCode());
  }

  private reconcileDrafts(): void {
    const form = this.formData();
    const selectedCodes = form.selected_sps.map(sp => sp.official_code);
    const draftCodes = form.toc_drafts.map(d => d.sp_code);

    // Detect a removed SP that holds a saved/in-progress alignment (needs confirm).
    const removed = draftCodes.filter(code => !selectedCodes.includes(code));
    const destructive = removed.find(code => this.hasMeaningfulAlignment(code));
    if (destructive) {
      this.confirmDestructiveRemoval(destructive);
      return;
    }

    // No destructive removal: sync drafts to the current selection in order.
    this.syncDraftsToSelection();
  }

  // Rebuild toc_drafts to match the current selection order; preserve existing
  // drafts, append empty drafts for new SPs, drop drafts for removed SPs.
  private syncDraftsToSelection(): void {
    this.formData.update(form => {
      const existing = new Map(form.toc_drafts.map(d => [d.sp_code, d]));
      const toc_drafts = form.selected_sps.map(sp => existing.get(sp.official_code) ?? this.emptyDraft(sp.official_code));
      // R-BIL-127 AC.4 — deselecting the SP holding Primary clears the
      // Primary (and re-blocks save via canSave()'s primary_sp_code clause).
      const primary_sp_code = this.primaryStillSelected(form.primary_sp_code, form.selected_sps)
        ? form.primary_sp_code
        : null;
      return { ...form, toc_drafts, primary_sp_code };
    });
  }

  private primaryStillSelected(primarySpCode: string | null, selected: SelectedScienceProgram[]): boolean {
    return !!primarySpCode && selected.some(sp => sp.official_code === primarySpCode);
  }

  // D-6a — re-select the removed SP (so its chip stays) and ask the house confirm.
  private confirmDestructiveRemoval(spCode: string): void {
    // Re-add the SP to keep the chip while the user decides (Cancel default).
    const restored = this.draftSp(spCode);
    this.formData.update(form => {
      if (form.selected_sps.some(sp => sp.official_code === spCode)) return form;
      return { ...form, selected_sps: [...form.selected_sps, restored] };
    });

    this.actions.showGlobalAlert({
      severity: 'secondary',
      summary: this.DESELECT_CONFIRM_SUMMARY,
      detail: this.DESELECT_CONFIRM_DETAIL,
      confirmCallback: {
        label: 'Remove',
        event: () => this.applyDestructiveRemoval(spCode)
      },
      cancelCallback: {
        label: 'Cancel',
        event: () => { /* keep the SP selected — chip already restored above */ }
      }
    });
  }

  private applyDestructiveRemoval(spCode: string): void {
    this.formData.update(form => ({
      ...form,
      selected_sps: form.selected_sps.filter(sp => sp.official_code !== spCode),
      // R-BIL-127 AC.4 — the confirmed removal is exactly the "deselecting
      // the SP holding Primary" case; clear the Primary if it matches.
      primary_sp_code: form.primary_sp_code === spCode ? null : form.primary_sp_code,
      toc_drafts: form.toc_drafts.filter(d => d.sp_code !== spCode)
    }));
    // Clear any block error scoped to the removed SP.
    const errors = this.blockErrors();
    if (errors[spCode]) {
      const rest = { ...errors };
      delete rest[spCode];
      this.blockErrors.set(rest);
    }
  }

  // AC-02.3 / D-6 — an SP "holds" an alignment when its draft has any answer/cascade
  // value OR the server saved one for it.
  private hasMeaningfulAlignment(spCode: string): boolean {
    const draft = this.formData().toc_drafts.find(d => d.sp_code === spCode);
    if (draft && this.isDraftTouched(draft)) return true;
    return (this.alignment()?.toc_alignments ?? []).some(a => a.sp_code === spCode);
  }

  private isDraftTouched(draft: SpAlignmentDraft): boolean {
    return (
      draft.aligns_with_toc !== null ||
      draft.level !== null ||
      draft.toc_result_id !== null ||
      draft.indicator_id !== null ||
      draft.quantitative_contribution !== null
    );
  }

  // T-BIL-TM2-04 — replace an SP's draft immutably (block never mutates inputs).
  // @sdd-spec docs/specs/bilateral/toc-optional-mapping/design.md §14 OQ-C1-5 (this path
  // never existed under any prefix; see Finding 1 — the rationale survives only in comments)
  // Upsert (insert-or-replace): if the SP's draft entry is momentarily absent
  // (e.g. selection reconcile not yet settled), append it instead of dropping the
  // answer — guarantees a "Yes"/edit is always recorded (REQ-BIL-SGU-01/02).
  onDraftChange(next: SpAlignmentDraft): void {
    this.formData.update(form => {
      const exists = form.toc_drafts.some(d => d.sp_code === next.sp_code);
      const toc_drafts = exists
        ? form.toc_drafts.map(d => (d.sp_code === next.sp_code ? next : d))
        : [...form.toc_drafts, next];
      return { ...form, toc_drafts };
    });
    // Clear any 400 block error for this SP on edit (AC-08.2).
    const errors = this.blockErrors();
    if (errors[next.sp_code]) {
      const rest = { ...errors };
      delete rest[next.sp_code];
      this.blockErrors.set(rest);
    }
  }

  draftForSp(spCode: string): SpAlignmentDraft {
    return this.formData().toc_drafts.find(d => d.sp_code === spCode) ?? this.emptyDraft(spCode);
  }

  blockErrorsForSp(spCode: string): Record<string, string> | null {
    return this.blockErrors()[spCode] ?? null;
  }

  private emptyDraft(spCode: string): SpAlignmentDraft {
    return {
      sp_code: spCode,
      aligns_with_toc: null,
      level: null,
      toc_result_id: null,
      indicator_id: null,
      quantitative_contribution: null
    };
  }

  private draftSp(spCode: string): SelectedScienceProgram {
    const existing = this.formData().selected_sps.find(sp => sp.official_code === spCode);
    if (existing) return existing;
    const fromCatalog = this.sciencePrograms().find(sp => sp.code === spCode);
    return fromCatalog
      ? { official_code: fromCatalog.code, name: fromCatalog.name, category: fromCatalog.category ?? null, color: fromCatalog.color ?? null }
      : { official_code: spCode };
  }

  private clearRejectedSpError(): void {
    if (this.rejectedSpCodes().length > 0) this.rejectedSpCodes.set([]);
    const errors = this.inlineErrors();
    if (errors?.['sp_codes']) {
      const rest = { ...errors };
      delete rest['sp_codes'];
      this.inlineErrors.set(Object.keys(rest).length > 0 ? rest : null);
    }
  }

  // REQ-BIL-ASR-03 (AC-03.2) — used by the chip template to apply error styling to
  // chips whose code was rejected by the last PATCH 400.
  isRejectedSp(code: string | null | undefined): boolean {
    if (!code) return false;
    return this.rejectedSpCodes().includes(code);
  }

  // Selected-chip enrichment: the form's selected value carries only
  // official_code/name/color, so resolve the full SP (code, allocation,
  // icon_key) from the loaded science-programs list for the chip display.
  findScienceProgram(code: string | null | undefined): PoolFundingScienceProgram | undefined {
    if (!code) return undefined;
    return this.sciencePrograms().find(sp => sp.code === code);
  }

  private buildRejectedSpMessage(codes: string[]): string {
    return `${this.REJECTED_SP_MESSAGE_PREFIX}${codes.join(', ')}${this.REJECTED_SP_MESSAGE_SUFFIX}`;
  }

  retryCatalog(): void {
    void this.bilateralService.getTocCatalog(this.resultCode());
  }

  // Wired explicitly instead of reusing the shared linear `saveData('back')`
  // pattern, for two reasons:
  //   1. Pool Funding Alignment is the sidebar's only OPTIONAL section and sits
  //      last in `allOptions` (result-sidebar.component.ts), so "back" means the
  //      section rendered immediately above it, not a step in the linear flow.
  //   2. Back must not attempt a save: `canSave()` blocks on an unanswered ToC
  //      question, so a save-then-navigate Back would silently do nothing — the
  //      exact dead-button symptom this fixes. links-to-result makes the same
  //      choice (navigate('back') never saves).
  onBack(): void {
    const version = this.route.snapshot.queryParamMap.get('version');
    const queryParams = version ? { version } : undefined;
    void this.router.navigate(['/result', this.resultCode(), this.previousSectionPath()], {
      queryParams,
      replaceUrl: true
    });
  }

  // `ip-rights` renders only for indicator_id 1 and 2 (result-sidebar.component.ts
  // `allOptions`); for every other indicator the section directly above Pool
  // Funding Alignment is `evidence`, which is unconditional. indicator_id 5
  // never reaches this page — the constructor redirects it out.
  private previousSectionPath(): string {
    const indicatorId = this.cache.currentMetadata()?.indicator_id;
    return indicatorId === 1 || indicatorId === 2 ? 'ip-rights' : 'evidence';
  }

  async onSave(): Promise<void> {
    if (!this.canSave()) return;
    this.inlineErrors.set(null);
    this.rejectedSpCodes.set([]);
    this.blockErrors.set({});

    const form = this.formData();
    // AC-09.1 — when version-locked, do NOT submit toc_alignments at all.
    const includeToc = form.has_contribution === true && this.showTocBlocks() && !this.versionLocked();
    // @sdd-spec docs/specs/bilateral/primary-contributing-sp — T-15 / R-BIL-128 AC.3
    // The PATCH body carries AT MOST ONE toc_alignments entry, for the Primary —
    // never the full `form.toc_drafts` set (that would resubmit every
    // Contributing SP's stale/empty draft, which the server now rejects with
    // `toc_alignment_not_primary_sp`, R-BIL-124). Filtering `toc_drafts` down to
    // the Primary's sp_code before handing it to `writeDtoFromDrafts` makes a
    // second entry structurally impossible: the array literally cannot contain
    // more than one draft once filtered by a single equality check, and
    // `writeDtoFromDrafts` never adds entries beyond what it's given.
    const primaryDraft = form.primary_sp_code
      ? form.toc_drafts.filter(d => d.sp_code === form.primary_sp_code)
      : [];
    const body: UpdatePoolFundingAlignmentDto = {
      has_contribution: form.has_contribution as boolean,
      ...(form.has_contribution ? { sp_codes: form.selected_sps.map(sp => sp.official_code) } : {}),
      // R-BIL-127 — canSave() already blocks this call when has_contribution is
      // true and no Primary is chosen, so `form.primary_sp_code` is populated
      // whenever it is sent; omitted (not sent as undefined/empty) otherwise.
      ...(form.has_contribution && form.primary_sp_code ? { primary_sp_code: form.primary_sp_code } : {}),
      ...(includeToc ? { toc_alignments: this.bilateralService.writeDtoFromDrafts(primaryDraft) } : {})
    };

    const result = await this.bilateralService.patchAlignment(this.resultCode(), body);

    if (result.ok) {
      this.seedFromServer(result.data);
      this.clarityService?.trackEvent('bilateral.alignment.saved', {
        result_code: result.data.result_code,
        has_contribution: result.data.has_contribution,
        sp_count: (result.data.selected_science_programs ?? []).length,
        toc_alignment_count: (body.toc_alignments ?? []).length
      });
      this.actions.showToast({
        severity: 'success',
        summary: 'Pool Funding Alignment',
        detail: 'Saved'
      });
      return;
    }

    if (result.status === 400) {
      // AC-08.2 — route per-SP ToC errors to the owning block.
      if (result.tocAlignmentErrors && result.tocAlignmentErrors.length > 0) {
        const bySp: Record<string, Record<string, string>> = {};
        for (const err of result.tocAlignmentErrors) {
          const key = err.field && err.field.length > 0 ? err.field : '_';
          bySp[err.sp_code] = { ...(bySp[err.sp_code] ?? {}), [key]: err.message };
        }
        this.blockErrors.set(bySp);
      }
      // REQ-BIL-ASR-03 — rejected SP codes drive an inline picker error + chip
      // highlight (no generic toast — already suppressed for /pool-funding-alignment).
      if (result.unknownSpCodes && result.unknownSpCodes.length > 0) {
        this.rejectedSpCodes.set([...result.unknownSpCodes]);
        this.inlineErrors.set({
          ...(result.fieldErrors ?? {}),
          sp_codes: this.buildRejectedSpMessage(result.unknownSpCodes)
        });
        return;
      }
      // R-BIL-127 — defensive: canSave() should have prevented this from ever
      // firing (design.md §6.1), but surface it inline rather than a global
      // toast if it does (e.g. a race with another tab's edit).
      if (result.primarySpError) {
        this.inlineErrors.set({
          ...(result.fieldErrors ?? {}),
          primary_sp_code: result.primarySpError
        });
        return;
      }
      if (result.tocAlignmentErrors && result.tocAlignmentErrors.length > 0 && !result.fieldErrors) {
        // ToC errors already routed inline to the blocks; nothing global to show.
        return;
      }
      this.inlineErrors.set(result.fieldErrors ?? { _global: result.description || 'Validation failed' });
      return;
    }

    if (result.status === 409) {
      // AC-08.3/09.1 — version-locked 409: refetch alignment + catalog, render the
      // version-gate notice and disable the ToC inputs. Matched by code/description.
      if (this.isVersionLocked409(result.description)) {
        this.versionLockedFrom409.set(true);
        await this.bilateralService.getAlignment(this.resultCode());
        await this.bilateralService.getTocCatalog(this.resultCode());
        this.actions.showToast({
          severity: 'warning',
          summary: 'Version locked',
          detail: 'Theory of Change alignment is locked for this version. Your ToC changes were not applied.'
        });
        return;
      }
      // Refetch so the read-only flags refresh — `readOnlyCause` then resolves to
      // the right cause ('prms-sourced' vs 'synced') and the matching banner renders
      // (AC-02.4). Differentiate the toast copy by the locked PRMS-sourced 409 desc.
      await this.bilateralService.getAlignment(this.resultCode());
      const isPrmsSourced = result.description === this.PRMS_SOURCED_409_DESCRIPTION;
      this.actions.showToast(
        isPrmsSourced
          ? {
              severity: 'warning',
              summary: 'Owned by PRMS',
              detail: 'This result is owned by PRMS. Bilateral alignment is read-only in STAR. Your changes were not applied.'
            }
          : {
              severity: 'warning',
              summary: 'Synced to PRMS',
              detail: 'This result was synced to PRMS. Your unsaved alignment changes were not applied.'
            }
      );
      return;
    }
    // 5xx — global httpErrorInterceptor owns the toast; form state preserved for retry.
  }

  private isVersionLocked409(description: string | undefined): boolean {
    if (!description) return false;
    return description.toLowerCase().includes('toc_mapping_version_locked') ||
      description.toLowerCase().includes('version locked');
  }

  // Catalog delegation for the block input (kept as a method — the block consumes a
  // plain value, OnPush re-reads only on input identity changes).
  catalogForSp(spCode: string) {
    return this.bilateralService.catalogForSp(spCode);
  }

  private snapshotFromServer(alignment: AlignmentResponse): AlignmentFormData {
    // Prefer the new SP field; fall back to the deprecated lever payload so a
    // response that hasn't migrated yet still seeds something readable. Form
    // state must be objects with `official_code` populated — the multiselect
    // enriches them with name/color from the SP catalog.
    const sps = alignment.selected_science_programs;
    const selected_sps: SelectedScienceProgram[] = sps && sps.length > 0
      ? sps.filter(sp => !!sp.code).map(sp => ({
          official_code: sp.code,
          name: sp.name,
          category: sp.category ?? null,
          color: sp.color ?? null
        }))
      : alignment.selected_levers
          .filter(l => !!l.lever_code)
          .map(l => ({ official_code: l.lever_code, name: l.lever_name }));
    // @sdd-spec docs/specs/bilateral/primary-contributing-sp — T-14 / R-BIL-127, R-BIL-126
    // `null` when no SP carries role: 'PRIMARY' — the deprecated lever fallback
    // above (no role data at all) and a legacy alignment (R-BIL-126, every role
    // null) both land here correctly.
    const primary_sp_code = (sps ?? []).find(sp => sp.role === 'PRIMARY')?.code ?? null;
    // AC-08.1 — pre-fill per-SP drafts from saved alignments, ordered by selection.
    const savedDrafts = this.bilateralService.draftsFromSaved(alignment.toc_alignments);
    const byCode = new Map(savedDrafts.map(d => [d.sp_code, d]));
    const toc_drafts: SpAlignmentDraft[] = selected_sps.map(
      sp => byCode.get(sp.official_code) ?? this.emptyDraft(sp.official_code)
    );
    return {
      has_contribution: alignment.has_contribution,
      selected_sps,
      primary_sp_code,
      toc_drafts
    };
  }

  // AC-08.4 — a saved "Yes" alignment is stale when its toc_result_id no longer
  // resolves in the live catalog for its SP/level (staleness is catalog-derived;
  // the flat backend read-back never carries an `is_stale` flag — decision D-10).
  private isStaleSaved(saved: SavedTocAlignment): boolean {
    if (!saved.aligns_with_toc || saved.toc_result_id == null) return false;
    const catalog = this.bilateralService.catalogForSp(saved.sp_code);
    if (!catalog) return true;
    return !catalog.levels.some(group =>
      group.toc_results.some(r => r.toc_result_id === saved.toc_result_id)
    );
  }

  // The per-SP ToC question is required (*), so a rendered draft is saveable only
  // once answered: unanswered (null) blocks; "No" is complete; "Yes" needs at
  // least Level + HLO — the floor (R-BIL-112 AC.1-3, A-1). `indicator_id` is free;
  // `quantitative_contribution` is free but must be `>= 0` when supplied. Refines
  // OQ-UX-3 (unanswered was previously treated as non-blocking); the completeness
  // half of the former gate (requiring the full cascade) was reverted (D-C1-4) —
  // see `writeDtoFromDrafts` (bilateral.service.ts) for the paired payload change.
  private isDraftSaveable(draft: SpAlignmentDraft): boolean {
    if (draft.aligns_with_toc === null) return false; // unanswered → required, blocks save
    if (draft.aligns_with_toc === false) return true; // "No" is a complete answer
    return (
      draft.level !== null &&
      draft.toc_result_id !== null &&
      (draft.quantitative_contribution === null || draft.quantitative_contribution >= 0)
    );
  }

  private sameCodeSet(a: string[], b: string[]): boolean {
    if (a.length !== b.length) return false;
    const sortedA = [...a].sort();
    const sortedB = [...b].sort();
    return sortedA.every((v, i) => v === sortedB[i]);
  }

  // Order-insensitive draft comparison by sp_code; compares every draft field.
  private sameDraftSet(a: SpAlignmentDraft[], b: SpAlignmentDraft[]): boolean {
    if (a.length !== b.length) return false;
    const mapB = new Map(b.map(d => [d.sp_code, d]));
    for (const da of a) {
      const db = mapB.get(da.sp_code);
      if (!db) return false;
      if (
        da.aligns_with_toc !== db.aligns_with_toc ||
        da.level !== db.level ||
        da.toc_result_id !== db.toc_result_id ||
        da.indicator_id !== db.indicator_id ||
        da.quantitative_contribution !== db.quantitative_contribution
      ) {
        return false;
      }
    }
    return true;
  }
}
