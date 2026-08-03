/**
 * Pure band mapper for the Indicator-metadata section (R-IMC-008, design §7.1, DD-5).
 *
 * `docs/specs/project-dashboard/indicator-metadata-charts/tasks.md` § T-11.
 *
 * Builds a **data model** — one band per indicator, each carrying its cards —
 * from `ContractFullReports` (T-02/T-10's 10 sections) plus the host's
 * already-computed `indicatorsWithResults()` (`project-dashboard.component.ts:121`).
 * The template becomes a loop over this model rather than 10 hand-written card
 * instances, which is what makes "each card bound to its own section" a cheap
 * per-entry assertion (KZ-005 / DC-5) instead of ten hand-written tests that a
 * later, 11th card would not inherit.
 *
 * **Pure by construction** — no injected service, no `DataSource`-equivalent,
 * no reach into the host component. Both arguments are supplied by the caller.
 *
 * Three decisions this file is not allowed to get wrong silently:
 *
 * 1. **Bands are matched to indicators by `indicatorId`, never by `label`.**
 *    `label` is `formatIndicatorName()` display text
 *    (`project-dashboard.component.ts:565`) — a name edit would silently empty
 *    a band with no error, exactly the failure design DD-4 already paid for
 *    once (Training resolved by id, not by `session_types.name`, for the same
 *    reason). The four ids below are not guessed: they gate real, load-bearing
 *    behaviour elsewhere in this codebase today —
 *      - `alliance-alignment.component.ts:105-106`:
 *        `isOicrIndicator = ... indicator_id === 5`,
 *        `isPolicyChangeIndicator = ... indicator_id === 4`.
 *      - `create-result-form.component.ts:182`: `if (newIndicatorId === 5)`.
 *      - `indicators.service.ts:32`: `targetIndicatorIds = [1, 2, 4, 5]` — the
 *        exact four ids this spec's four bands cover.
 *      - `star-pdf-report.util.ts:3-4`: `CAPACITY_SHARING_INDICATOR_ID = 1`,
 *        `INNOVATION_DEVELOPMENT_INDICATOR_ID = 2` (imported below).
 *    No single exported enum unifies all four today; Policy Change (4) and
 *    OICR (5) are declared locally with the citations above rather than
 *    invented. If this ever needs a single source of truth, that is a
 *    separate, cross-cutting change — out of this task's scope.
 *
 * 2. **Band order is asserted by this mapper, not inherited from the input.**
 *    `indicatorsWithResults()` happens to already arrive sorted by `value`
 *    descending (`project-dashboard.component.ts:116`), but that is a property
 *    of *that* computed today, not a contract this file can see or depend on.
 *    Relying on it would satisfy R-IMC-008 AC.3 by accident and break silently
 *    the moment that upstream sort changes. This mapper re-sorts its own
 *    output by `resultCount` descending, and its spec asserts that against a
 *    fixture whose indicator order is deliberately **not** descending.
 *
 * 3. **`IndicatorMetadataCount.name: string | null` is resolved here, once.**
 *    Three label columns are genuinely nullable server-side and the server
 *    deliberately does not `COALESCE` them (`contract-full-reports.interface.ts`
 *    doc-comment, T-04's carried note: prefer the fallback client-side). This
 *    file is where `name: string | null` becomes `label: string` and
 *    `id: number` becomes `id: string` for `ProjectDashboardRankedListItem`.
 *    The fallback is `UNLABELLED_CATEGORY_FALLBACK`, never the literal text
 *    `"null"`.
 */

import { ContractFullReports } from '@interfaces/contract-full-reports.interface';
import { ProjectDashboardRankedListItem } from '@interfaces/project-dashboard.interface';
import { CAPACITY_SHARING_INDICATOR_ID, INNOVATION_DEVELOPMENT_INDICATOR_ID } from '@shared/utils/star-pdf-report.util';

/**
 * Policy Change and OICR indicator ids. See point 1 of this file's header
 * comment for the citations that make these verified facts rather than
 * guesses — the same standard DD-4 held Training's `SessionTypeEnum` to.
 */
const POLICY_CHANGE_INDICATOR_ID = 4;
const OICR_INDICATOR_ID = 5;

/**
 * Deliberate, stated fallback for a `null` label (point 3 above). Chosen so it
 * can never render as the literal text `"null"` and reads as "no category
 * recorded" rather than an error.
 */
export const UNLABELLED_CATEGORY_FALLBACK = 'Unspecified';

/** Gender card provenance note (R-IMC-005 AC.5) — both training formats are combined. */
export const GENDER_PROVENANCE_NOTE = 'Includes participants from both individual and group training records.';

/**
 * Degree card filter-scope pill (R-IMC-006 AC.4) — the number is not "all degrees".
 * **Superseded by `docs/specs/project-dashboard/degree-chart-empty/requirements.md`
 * R-DCE-002**: the report's degree branch no longer restricts to Training
 * (long-term Engagements with a recorded degree now count too), so this note
 * must not claim a training-only scope. Do not restore the word "training"
 * from the archived R-IMC-006 wording.
 */
export const DEGREE_FILTER_SCOPE_NOTE = 'Includes only long-term records with a recorded degree.';

/**
 * The 10 `ContractFullReports` fields this spec adds, as a literal union so a
 * card's `sectionKey` can only ever name a field that actually exists on the
 * payload — a typo here is a compile error, not a silent `undefined` bind.
 */
export type IndicatorMetadataSectionKey = Extract<
  keyof ContractFullReports,
  | 'innovation_nature'
  | 'innovation_type'
  | 'innovation_readiness'
  | 'oicr_maturity'
  | 'policy_type'
  | 'policy_stage'
  | 'session_format'
  | 'session_type'
  | 'gender_distribution'
  | 'degree'
>;

/**
 * Structural mirror of one entry of `ProjectDashboardComponent.indicatorsWithResults()`
 * (`project-dashboard.component.ts:106-121`). Declared locally because that
 * computed's element type is not exported — TS structural typing lets the
 * host pass its own array straight through with no adapter.
 */
export interface IndicatorSummaryForBands {
  readonly id: number;
  readonly indicatorId: number | null;
  readonly label: string;
  readonly value: number;
  readonly color: string;
}

/** One card's data, ready for `ProjectDashboardCardComponent` with no further transformation. */
export interface IndicatorMetadataCardModel {
  /** Names the `ContractFullReports` field this card is bound to — also the stable key for host-owned per-card expansion state (mirrors `ChartKey`, `project-dashboard.component.ts:48`). */
  readonly sectionKey: IndicatorMetadataSectionKey;
  /** Card title, verbatim from `requirements.md` §4.1 (R-IMC-008 AC.1). */
  readonly title: string;
  readonly items: ProjectDashboardRankedListItem[];
  /**
   * R-IMC-010: true when the indicator has results (this card's band exists
   * at all) but its own section is empty — "unanswered field", not "absent".
   * Distinct from R-IMC-009's band-level hidden case, which never produces a
   * card in the first place.
   */
  readonly empty: boolean;
  /** Present only on the Gender card (R-IMC-005 AC.5). */
  readonly provenanceNote?: string;
  /** Present only on the Degree card (R-IMC-006 AC.4). */
  readonly filterScopeNote?: string;
}

/** One band — one indicator with results, its cards in `requirements.md` §4.1 order. */
export interface IndicatorMetadataBandModel {
  readonly indicatorId: number;
  /** Verbatim from the matched `indicatorsWithResults()` entry — the same `formatIndicatorName()` text used elsewhere, not re-derived here. */
  readonly indicatorLabel: string;
  readonly resultCount: number;
  readonly color: string;
  readonly cards: IndicatorMetadataCardModel[];
}

interface CardDefinition {
  readonly sectionKey: IndicatorMetadataSectionKey;
  readonly title: string;
}

interface BandDefinition {
  readonly indicatorId: number;
  readonly cards: readonly CardDefinition[];
}

/**
 * Static shape of the four bands, keyed by indicator id and ordered — within
 * each band — exactly as `requirements.md` §4.1 lists that indicator's charts.
 * This table is the single place card membership, order and titles are
 * declared; nothing else in this file may invent a card.
 */
const BAND_DEFINITIONS: readonly BandDefinition[] = [
  {
    indicatorId: INNOVATION_DEVELOPMENT_INDICATOR_ID,
    cards: [
      { sectionKey: 'innovation_nature', title: 'Innovation Nature' },
      { sectionKey: 'innovation_type', title: 'Innovation Type' },
      { sectionKey: 'innovation_readiness', title: 'Current Readiness' }
    ]
  },
  {
    indicatorId: CAPACITY_SHARING_INDICATOR_ID,
    cards: [
      { sectionKey: 'session_format', title: 'Training or engagement to report' },
      { sectionKey: 'session_type', title: 'Training vs. Engagement' },
      { sectionKey: 'gender_distribution', title: 'Gender' },
      { sectionKey: 'degree', title: 'Degree' }
    ]
  },
  {
    indicatorId: POLICY_CHANGE_INDICATOR_ID,
    cards: [
      { sectionKey: 'policy_type', title: 'Policy Type' },
      { sectionKey: 'policy_stage', title: 'Stage in Policy Process' }
    ]
  },
  {
    indicatorId: OICR_INDICATOR_ID,
    cards: [{ sectionKey: 'oicr_maturity', title: 'OICR Maturity' }]
  }
];

/**
 * Builds the Indicator-metadata band model.
 *
 * @param payload the `GET reports/full` payload (`ContractFullReports`), or
 *   `null` while it has not loaded yet — every section then defaults to `[]`,
 *   matching `GetFullContractReportsService`'s own `?? []` accessor pattern.
 * @param indicatorsWithResults the host's `indicatorsWithResults()` snapshot
 *   (`project-dashboard.component.ts:121`) — already filtered to indicators
 *   with `value > 0`. An indicator absent from this array contributes **no**
 *   band (R-IMC-009 AC.1/AC.2): visibility is driven entirely by this
 *   argument, not by a second, parallel check inside the mapper.
 * @returns bands ordered by `resultCount` descending (R-IMC-008 AC.3), each
 *   with its cards in `requirements.md` §4.1 order.
 */
export function buildIndicatorMetadataBands(
  payload: ContractFullReports | null,
  indicatorsWithResults: readonly IndicatorSummaryForBands[]
): IndicatorMetadataBandModel[] {
  const bands: IndicatorMetadataBandModel[] = [];

  for (const definition of BAND_DEFINITIONS) {
    const source = indicatorsWithResults.find(indicator => indicator.indicatorId === definition.indicatorId);
    if (!source) {
      // R-IMC-009 AC.1/AC.2: zero results for this indicator -> no band, no cards.
      continue;
    }

    bands.push({
      indicatorId: definition.indicatorId,
      indicatorLabel: source.label,
      resultCount: source.value,
      color: source.color,
      cards: definition.cards.map(cardDefinition => buildCard(payload, cardDefinition))
    });
  }

  // R-IMC-008 AC.3, asserted by construction rather than inherited — see
  // point 2 of this file's header comment.
  return bands.sort((first, second) => second.resultCount - first.resultCount);
}

function buildCard(payload: ContractFullReports | null, definition: CardDefinition): IndicatorMetadataCardModel {
  const rows = payload?.[definition.sectionKey] ?? [];
  const items = rows.map(row => ({
    id: String(row.id),
    label: row.name ?? UNLABELLED_CATEGORY_FALLBACK,
    count: row.count
  }));

  const card: IndicatorMetadataCardModel = {
    sectionKey: definition.sectionKey,
    title: definition.title,
    items,
    empty: items.length === 0
  };

  if (definition.sectionKey === 'gender_distribution') {
    return { ...card, provenanceNote: GENDER_PROVENANCE_NOTE };
  }

  if (definition.sectionKey === 'degree') {
    return { ...card, filterScopeNote: DEGREE_FILTER_SCOPE_NOTE };
  }

  return card;
}
