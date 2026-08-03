import { ChangeDetectionStrategy, ChangeDetectorRef, Component, computed, inject, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Select, SelectModule } from 'primeng/select';
import { RadioButtonModule } from 'primeng/radiobutton';
import { InputNumberModule } from 'primeng/inputnumber';
import {
  SpAlignmentDraft,
  TocCatalogIndicator,
  TocCatalogResult,
  TocCatalogSp,
  TocLevel
} from '@interfaces/bilateral/pool-funding-alignment.interface';
import {
  IndicatorTypeClassification,
  RESULT_TYPE_LABELS,
  TOC_TYPE_MATRIX,
  TYPE_BADGE_LABELS,
  classifyIndicator
} from '../../utils/indicator-type-guidance.util';

/**
 * Minimal SP shape this block needs. Mirrors the page's local
 * `SelectedScienceProgram` view-model but is owned here so the pure block never
 * imports from the page component (T-BIL-TM2-03 scope boundary).
 */
export interface SpTocBlockScienceProgram {
  official_code: string;
  name?: string;
  category?: string | null;
  color?: string | null;
}

/** Plain dropdown option (label/value pairs fed to raw `p-select`). */
interface SelectOption<T> {
  label: string;
  value: T;
}

/**
 * HLO option carries the AOW prefix separately so the template can bold it.
 * `hasTypeMatch` (AC-04.1 / D-ITG-4): true iff the HLO contains ≥1 indicator
 * classifying `type-match` for the current result type — wildcards (`custom`)
 * deliberately do NOT count, and it is false for every option when guidance is
 * disabled (no tags, AC-05.1).
 * @sdd-spec docs/specs/bilateral-module/toc-indicator-type-guidance (T-BIL-ITG-05)
 */
interface HloSelectOption {
  value: number;
  aowCode: string | null;
  title: string;
  hasTypeMatch: boolean;
}

/** AC-04.2 — actionable row in the no-type-match notice (design §4.2 item 2). */
interface HloSuggestion {
  value: number;
  aowCode: string | null;
  title: string;
}

/**
 * Indicator option enriched with its type classification + badge label
 * (REQ-BIL-ITG-02). `badge` is null for `unclassified` options (AC-02.2) —
 * which includes EVERY option when guidance is disabled (AC-05.1), so the flat
 * fallback renders exactly like today's list apart from these inert fields.
 * @sdd-spec docs/specs/bilateral-module/toc-indicator-type-guidance (T-BIL-ITG-03)
 */
export interface IndicatorSelectOption {
  label: string;
  value: number;
  badge: string | null;
  classification: IndicatorTypeClassification;
}

/** Grouped shape fed to `p-select [group]` (`optionGroupLabel`/`optionGroupChildren`). */
interface IndicatorSelectGroup {
  label: string;
  items: IndicatorSelectOption[];
}

/**
 * AC-03.1 — exact cross-type warning copy (design §4.2, NF-05). The indicator
 * side uses the canonical upstream `type_value` string (unambiguous), the
 * result side the display label from `RESULT_TYPE_LABELS`.
 * @sdd-spec docs/specs/bilateral-module/toc-indicator-type-guidance (T-BIL-ITG-04)
 */
const CROSS_TYPE_WARNING = (indTypeLabel: string, resTypeLabel: string): string =>
  `This indicator is typed “${indTypeLabel}”; this result is “${resTypeLabel}”. Confirm the contribution belongs here.`;

/**
 * AC-04.2 — exact intro copy of the no-type-match notice when compatible
 * same-SP-same-level HLOs exist; followed by the suggestion buttons
 * (design §4.2, NF-05).
 * @sdd-spec docs/specs/bilateral-module/toc-indicator-type-guidance (T-BIL-ITG-05)
 */
const NO_TYPE_MATCH_INTRO = (resTypeLabel: string, levelLabel: string): string =>
  `None of this result’s indicators are typed for ${resTypeLabel}. ${levelLabel}s with matching indicators:`;

/**
 * AC-04.4 — exact no-dead-end copy when NO HLO at this SP+level carries a
 * type-matching indicator (design §4.2, NF-05).
 * @sdd-spec docs/specs/bilateral-module/toc-indicator-type-guidance (T-BIL-ITG-05)
 */
const NO_TYPE_MATCH_ANYWHERE = (resTypeLabel: string, levelLabel: string): string =>
  `No ${levelLabel} in this Science Program has indicators typed for ${resTypeLabel}. You can select the closest indicator — it will be marked with a type notice.`;

/**
 * Per-SP ToC alignment cascade block (Level → HLO → Indicator → Contribution).
 *
 * PURE presentational component: it renders one SP's alignment from its inputs
 * and emits a brand-new `SpAlignmentDraft` on every user change (cascade resets
 * applied here). It NEVER mutates the `draft` input or its nested fields — the
 * hosting page (T-BIL-TM2-04) owns the draft array and reconciliation.
 *
 * D-8a: uses raw PrimeNG `p-select`/`p-radiobutton` (not the wrapped
 * `custom-fields/*`) because the wrapped fields source options only from a
 * registered ControlListService and can't take in-memory cascade options.
 *
 * @sdd-spec docs/specs/bilateral-module/toc-mapping-v2 (T-BIL-TM2-03)
 */
@Component({
  selector: 'app-sp-toc-alignment-block',
  standalone: true,
  imports: [FormsModule, SelectModule, RadioButtonModule, InputNumberModule],
  templateUrl: './sp-toc-alignment-block.component.html',
  styleUrl: './sp-toc-alignment-block.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SpTocAlignmentBlockComponent {
  private readonly cdr = inject(ChangeDetectorRef);

  // --- Inputs (signal inputs) -------------------------------------------------
  readonly sp = input.required<SpTocBlockScienceProgram>();
  readonly catalog = input<TocCatalogSp | null>(null);
  readonly allowedLevels = input<TocLevel[]>([]);
  readonly draft = input.required<SpAlignmentDraft>();
  readonly disabled = input<boolean>(false);
  readonly inlineErrors = input<Record<string, string> | null>(null);
  readonly catalogState = input<'loading' | 'ready' | 'error'>('ready');
  /**
   * The result's backend-owned `result_type` key (catalog envelope). Enters as
   * an input so the block stays pure — no service injection (D-ITG-3). Null /
   * unmatrixed keys disable all indicator-type guidance (AC-05.1).
   * @sdd-spec docs/specs/bilateral-module/toc-indicator-type-guidance (T-BIL-ITG-03)
   */
  readonly resultType = input<string | null>(null);

  // --- Outputs ----------------------------------------------------------------
  readonly draftChange = output<SpAlignmentDraft>();
  readonly retryCatalog = output<void>();

  // --- Static copy / label maps ----------------------------------------------
  /** §4.7 — Level key → display label. Single map, trivially revisable (OQ-3). */
  private static readonly LEVEL_LABELS: Record<TocLevel, string> = {
    OUTPUT: 'High Level Output',
    OUTCOME: 'Intermediate Outcome',
    EOI: '2030 Outcome'
  };

  readonly ALIGN_QUESTION = "Does this result align with the Program's TOC indicators?";
  readonly LEVEL_LABEL = 'Level';
  readonly INDICATOR_LABEL = 'Indicator';
  readonly CONTRIBUTION_LABEL = 'Quantitative contribution';
  readonly UNIT_LABEL = 'Unit of measurement';
  readonly TARGET_LABEL = 'Target';
  readonly EMPTY_HLO_MESSAGE = 'No Theory of Change results are available for this Science Program at the selected level.';
  readonly EMPTY_INDICATOR_MESSAGE = 'No indicators are available for the selected result in the Theory of Change catalog.';
  readonly LOADING_MESSAGE = 'Loading the Theory of Change catalog…';
  readonly CATALOG_ERROR_MESSAGE = "We couldn't load the Theory of Change catalog for this Science Program.";
  readonly RETRY_LABEL = 'Retry';
  /** AC-07.3 — callout wording uses the active reporting year (2026), not 2025. */
  readonly CONTRIBUTION_CALLOUT =
    'Enter this result’s quantitative contribution toward the selected indicator’s 2026 target. Use the indicator’s unit of measurement.';
  /** AC-02.1 — second group header of the grouped indicator dropdown (NF-05). */
  readonly OTHER_GROUP_LABEL = 'Other indicators';

  /** Dropdown panel height — long HLO/indicator labels scroll inside the panel. */
  readonly SELECT_SCROLL_HEIGHT = '280px';

  /** Measured trigger width (px) so the body-appended overlay matches the field. */
  private readonly selectPanelWidthPx = signal<number | null>(null);

  // --- Derived view state -----------------------------------------------------
  /** Stable, unique-ish id fragment for label/control wiring. */
  readonly spCode = computed(() => this.sp().official_code);

  /** True when the per-SP question is answered "Yes" (cascade visible). */
  readonly alignsYes = computed(() => this.draft().aligns_with_toc === true);

  /** HLO/level field label follows the selected level (§4.7); defaults generic. */
  readonly hloFieldLabel = computed(() => {
    const level = this.draft().level;
    return level ? SpTocAlignmentBlockComponent.LEVEL_LABELS[level] : 'High Level Output';
  });

  /** Level options from the server-owned allowedLevels, labeled per §4.7. */
  readonly levelOptions = computed<SelectOption<TocLevel>[]>(() =>
    this.allowedLevels().map(level => ({ label: SpTocAlignmentBlockComponent.LEVEL_LABELS[level], value: level }))
  );

  /** The catalog results for the currently selected level (or []). */
  private readonly tocResultsForLevel = computed<TocCatalogResult[]>(() => {
    const level = this.draft().level;
    const cat = this.catalog();
    if (!level || !cat) return [];
    return cat.levels.find(group => group.level === level)?.toc_results ?? [];
  });

  /** HLO options at the selected level. Title-only when `aow_code === null` (EOI). */
  readonly hloOptions = computed<HloSelectOption[]>(() =>
    this.tocResultsForLevel().map(result => ({
      value: result.toc_result_id,
      aowCode: result.aow_code,
      title: result.title,
      // AC-04.1 — lights the "has <type>" tag in the dropdown item template.
      hasTypeMatch: this.hloHasTypeMatch(result)
    }))
  );

  /** True when a level is chosen but the (SP, level) pair yields no results. */
  readonly showEmptyHlo = computed(() => !!this.draft().level && this.tocResultsForLevel().length === 0);

  /** The selected HLO (toc_result) from the catalog, if resolvable. */
  private readonly selectedTocResult = computed<TocCatalogResult | null>(() => {
    const id = this.normalizeNumericId(this.draft().toc_result_id);
    if (id == null) return null;
    return this.tocResultsForLevel().find(result => this.normalizeNumericId(result.toc_result_id) === id) ?? null;
  });

  // --- Indicator-type guidance (REQ-BIL-ITG-02 / AC-05.1) ---------------------
  // @sdd-spec docs/specs/bilateral-module/toc-indicator-type-guidance (T-BIL-ITG-03)

  /** True when the result type has a compatibility-matrix row (AC-05.1 gate). */
  readonly guidanceEnabled = computed(() => {
    const resultType = this.resultType();
    return resultType !== null && Object.hasOwn(TOC_TYPE_MATRIX, resultType);
  });

  /**
   * Indicator options for the chosen HLO — UNFILTERED (parent D-5, superseded
   * by toc-indicator-type-guidance): every indicator stays present and
   * selectable (AC-02.5); classification only annotates. When guidance is
   * disabled, `classifyIndicator` returns `unclassified` for everything, so
   * `badge` is null across the board and the list behaves exactly like today's.
   */
  readonly classifiedIndicators = computed<IndicatorSelectOption[]>(() => {
    const resultType = this.resultType();
    return (this.selectedTocResult()?.indicators ?? []).map(indicator => {
      const classification = classifyIndicator(resultType, indicator.type_value);
      return {
        label: indicator.indicator_description?.trim() || '—',
        value: indicator.indicator_id,
        // AC-02.2 — canonical/custom types get a short badge; unclassified none.
        badge: classification === 'unclassified' ? null : (TYPE_BADGE_LABELS[indicator.type_value?.trim() ?? ''] ?? null),
        classification
      };
    });
  });

  /**
   * Back-compat alias for the pre-guidance flat option list (same objects the
   * grouped shape regroups). Kept so `showEmptyIndicators` + existing consumers
   * are untouched (AC-06.2).
   */
  readonly indicatorOptions = this.classifiedIndicators;

  /** Groups render only with ≥1 recommended option — else flat fallback (AC-02.3 / D-ITG-5). */
  readonly indicatorGroupsEnabled = computed(
    () =>
      this.guidanceEnabled() &&
      this.classifiedIndicators().some(option => option.classification === 'type-match' || option.classification === 'wildcard')
  );

  /** AC-02.1 — "Recommended for <result type label>" group header (NF-05). */
  readonly recommendedGroupLabel = computed(() => `Recommended for ${RESULT_TYPE_LABELS[this.resultType() ?? ''] ?? ''}`);

  /**
   * What the indicator `p-select` binds: grouped (recommended = type-matches
   * then wildcards; other = other + unclassified in original catalog order)
   * when grouping is enabled, else the flat list (AC-02.1/02.3). An emptied
   * "Other" group is dropped — never an empty header.
   */
  readonly indicatorSelectOptions = computed<IndicatorSelectOption[] | IndicatorSelectGroup[]>(() => {
    const options = this.classifiedIndicators();
    if (!this.indicatorGroupsEnabled()) return options;
    const recommended = [
      ...options.filter(option => option.classification === 'type-match'),
      ...options.filter(option => option.classification === 'wildcard')
    ];
    const other = options.filter(option => option.classification === 'other' || option.classification === 'unclassified');
    const groups: IndicatorSelectGroup[] = [{ label: this.recommendedGroupLabel(), items: recommended }];
    if (other.length > 0) groups.push({ label: this.OTHER_GROUP_LABEL, items: other });
    return groups;
  });

  /** True when an HLO is chosen but its catalog row carries no indicators. */
  readonly showEmptyIndicators = computed(
    () => this.normalizeNumericId(this.draft().toc_result_id) != null && this.indicatorOptions().length === 0
  );

  /** The selected indicator — drives the contribution panel reveal (AC-06.2). */
  readonly selectedIndicator = computed<TocCatalogIndicator | null>(() => {
    const id = this.normalizeNumericId(this.draft().indicator_id);
    if (id == null) return null;
    return (
      this.selectedTocResult()?.indicators.find(
        indicator => this.normalizeNumericId(indicator.indicator_id) === id
      ) ?? null
    );
  });

  // --- Cross-type selection warning (REQ-BIL-ITG-03) ---------------------------
  // @sdd-spec docs/specs/bilateral-module/toc-indicator-type-guidance (T-BIL-ITG-04)

  /**
   * Classification of the currently selected indicator, or null while none is
   * selected / the saved id no longer resolves in the catalog (AC-03.4 stale
   * path: no indicator ⇒ no warning). Pure derivation from draft + catalog, so
   * a pre-populated saved cross-type draft classifies on first render with no
   * draft mutation or emission.
   */
  readonly selectedIndicatorClassification = computed<IndicatorTypeClassification | null>(() => {
    const indicator = this.selectedIndicator();
    return indicator ? classifyIndicator(this.resultType(), indicator.type_value) : null;
  });

  /**
   * AC-03.1/03.2 — warning copy when guidance is enabled AND the selected
   * indicator classifies `other`; null otherwise. Non-blocking by construction:
   * nothing else reads this — contribution reveal, validation, and the emitted
   * draft are untouched (AC-03.3).
   */
  readonly crossTypeWarningMessage = computed<string | null>(() => {
    if (!this.guidanceEnabled() || this.selectedIndicatorClassification() !== 'other') return null;
    const indicatorTypeLabel = this.selectedIndicator()?.type_value?.trim() ?? '';
    const resultTypeLabel = RESULT_TYPE_LABELS[this.resultType() ?? ''] ?? '';
    return CROSS_TYPE_WARNING(indicatorTypeLabel, resultTypeLabel);
  });

  // --- HLO hints + no-match guidance (REQ-BIL-ITG-04) -------------------------
  // @sdd-spec docs/specs/bilateral-module/toc-indicator-type-guidance (T-BIL-ITG-05)

  /**
   * D-ITG-4 — an HLO "has a type match" only on an EXACT `type-match`
   * classification; wildcards (`custom`) do NOT count — customs exist on most
   * HLOs and would light every option, diluting the discovery signal. When
   * guidance is disabled, `classifyIndicator` returns `unclassified` for every
   * input, so no HLO ever reports a match (AC-05.1).
   */
  private hloHasTypeMatch(tocResult: TocCatalogResult): boolean {
    const resultType = this.resultType();
    return tocResult.indicators.some(indicator => classifyIndicator(resultType, indicator.type_value) === 'type-match');
  }

  /**
   * AC-04.1 — short badge label of the result type's canonical `type_value`
   * ("Trained people" for `capacity_sharing`), rendered as "has <label>" on
   * matching HLO options. Empty when guidance is disabled (no tag renders then).
   */
  readonly typeMatchTagLabel = computed(() => TYPE_BADGE_LABELS[TOC_TYPE_MATRIX[this.resultType() ?? ''] ?? ''] ?? '');

  /**
   * AC-04.2 — up to 5 same-SP-same-level HLOs carrying ≥1 type-match indicator,
   * in catalog order, EXCLUDING the currently selected HLO. Feeds the actionable
   * suggestion buttons of the no-type-match notice.
   */
  readonly compatibleHloSuggestions = computed<HloSuggestion[]>(() => {
    const selectedId = this.normalizeNumericId(this.draft().toc_result_id);
    return this.tocResultsForLevel()
      .filter(result => this.normalizeNumericId(result.toc_result_id) !== selectedId && this.hloHasTypeMatch(result))
      .slice(0, 5)
      .map(result => ({ value: result.toc_result_id, aowCode: result.aow_code, title: result.title }));
  });

  /**
   * AC-04.2/04.4/04.5 — the no-type-match notice renders while guidance is
   * enabled and the selected (catalog-resolvable) HLO carries ZERO type-match
   * indicators. The selection may still offer wildcard "recommended" options —
   * that's fine; the notice is about exact matches (D-ITG-4). It disappears as
   * soon as the selected HLO has a type-match or nothing is selected.
   */
  readonly showNoTypeMatchNotice = computed(() => {
    if (!this.guidanceEnabled()) return false;
    const selected = this.selectedTocResult();
    return selected !== null && !this.hloHasTypeMatch(selected);
  });

  /**
   * Notice body copy: the intro over the suggestion list when compatible HLOs
   * exist at this SP+level (AC-04.2), the no-dead-end "anywhere" wording
   * otherwise (AC-04.4). Level label rides the same §4.7 map as the HLO field
   * label (`hloFieldLabel`).
   */
  readonly noTypeMatchNoticeMessage = computed(() => {
    const resultTypeLabel = RESULT_TYPE_LABELS[this.resultType() ?? ''] ?? '';
    const levelLabel = this.hloFieldLabel();
    return this.compatibleHloSuggestions().length > 0
      ? NO_TYPE_MATCH_INTRO(resultTypeLabel, levelLabel)
      : NO_TYPE_MATCH_ANYWHERE(resultTypeLabel, levelLabel);
  });

  // --- Emission helpers (cascade resets applied; inputs never mutated) --------
  private emit(patch: Partial<SpAlignmentDraft>): void {
    // Always build a brand-new object from the current input draft — no mutation.
    this.draftChange.emit({ ...this.draft(), ...patch });
  }

  onAlignsChange(value: boolean): void {
    // "No" hides the cascade and nulls all downstream fields (AC-03.2).
    if (value === false) {
      this.emit({
        aligns_with_toc: false,
        level: null,
        toc_result_id: null,
        indicator_id: null,
        quantitative_contribution: null
      });
      return;
    }
    this.emit({ aligns_with_toc: true });
  }

  onLevelChange(level: TocLevel | null): void {
    // Changing level resets HLO + indicator + contribution (AC-04.4).
    this.emit({ level, toc_result_id: null, indicator_id: null, quantitative_contribution: null });
  }

  onHloChange(tocResultId: number | string | null): void {
    // Changing HLO resets indicator + contribution (AC-05.3).
    this.emit({ toc_result_id: this.normalizeNumericId(tocResultId), indicator_id: null, quantitative_contribution: null });
  }

  onIndicatorChange(indicatorId: number | string | null): void {
    // New indicator clears any stale contribution so the panel re-prompts.
    this.emit({ indicator_id: this.normalizeNumericId(indicatorId), quantitative_contribution: null });
  }

  onContributionChange(value: number | null): void {
    // Guard against negatives at the emit boundary (AC-07.2; UI also clamps).
    const normalized = value != null && value < 0 ? 0 : value;
    this.emit({ quantitative_contribution: normalized });
  }

  onRetry(): void {
    this.retryCatalog.emit();
  }

  /** PrimeNG may emit numeric ids as strings — normalize before catalog lookups. */
  private normalizeNumericId(value: unknown): number | null {
    if (value == null || value === '') return null;
    const parsed = typeof value === 'number' ? value : Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  /** Overlay width tracks the trigger; capped so it never spills past the viewport. */
  selectPanelStyle(): Record<string, string> {
    const measured = this.selectPanelWidthPx();
    const base: Record<string, string> = { boxSizing: 'border-box' };
    if (measured == null || measured <= 0) {
      return { ...base, maxWidth: 'min(40rem, calc(100vw - 2rem))' };
    }
    const capped = Math.min(measured, window.innerWidth - 32);
    return {
      ...base,
      width: `${capped}px`,
      maxWidth: `${capped}px`,
      minWidth: `${capped}px`
    };
  }

  onSelectPanelShow(select: Select, trigger: HTMLElement): void {
    const width = Math.round(trigger.getBoundingClientRect().width);
    if (width <= 0) {
      return;
    }
    this.selectPanelWidthPx.set(width);
    this.cdr.markForCheck();
    setTimeout(() => select.overlayViewChild?.alignOverlay());
  }
}
