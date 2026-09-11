import { ResultAlignmentDto } from '../../../dto/result-alignment.dto';
import { PortfolioSectionHandler } from '../../core/portfolio-section-handler.interface';

/** Alignment view — adjust when defining the shape per portfolio. */
export type AlignmentSectionView = ResultAlignmentDto;

/**
 * Outcome of a narrow strategic-objectives-only save (design.md DD-1/DD-4).
 * The handler reports *what happened*; the caller (e.g. the AI formalizer)
 * decides how to surface it — the handler must not know about
 * `missing_fields` or any other reporting concept (DD-5).
 */
export interface StrategicObjectivesSaveReport {
  /** Whether this portfolio has any concept of strategic objectives at all. */
  supported: boolean;
  /** Deduplicated ids that were actually written. */
  saved: number[];
  /** Ids that were unknown, inactive, owned by another portfolio, or — when
   *  `supported` is false — simply not applicable to this portfolio. */
  discarded: number[];
}

/**
 * Outcome of a narrow levers-only save (design.md DD-1/DD-2/DD-8, §5.1).
 * Unlike `StrategicObjectivesSaveReport`, this report carries **no**
 * `supported` flag: both portfolios support `primary_levers` — they simply
 * disagree about what it means (DD-2) — so "not applicable to this
 * portfolio" never arises here. The handler reports *what happened*; the
 * caller (e.g. the AI formalizer) decides how to surface it (DD-8).
 */
export interface LeversSaveReport {
  /** Deduplicated ids that were actually written. */
  saved: number[];
  /** Ids that were unknown, inactive, or owned by another portfolio. */
  discarded: number[];
}

/**
 * Contract for the alignment section's per-portfolio handlers. Extends the
 * generic `PortfolioSectionHandler` (rather than widening that generic
 * itself — DD-1) with methods scoped to a single sub-section each, so the
 * AI-formalize path never has to go through the section-wide `save`.
 */
export interface AlignmentSectionHandler
  extends PortfolioSectionHandler<ResultAlignmentDto, AlignmentSectionView> {
  /**
   * Persists only the strategic-objectives sub-section for `resultId`.
   * Deliberately takes the raw id list rather than the full section
   * `PortfolioHandlerContext` — the AI-formalize caller has no
   * `EntityManager` to thread and must not thread one (DD-8): this method
   * runs in its own transaction like every other formalize step, joining
   * neither `save`'s transaction nor any caller-supplied one.
   */
  saveStrategicObjectives(
    resultId: number,
    ids: number[],
  ): Promise<StrategicObjectivesSaveReport>;

  /**
   * Persists only the levers sub-section for `resultId`. Both portfolios
   * implement this with real writes — unlike `saveStrategicObjectives`,
   * there is no "unsupported" portfolio here (DD-2) — but each writes at
   * its own role and its own `is_primary` value: portfolio 1 at
   * `lever_role_id = ALIGNMENT` with `is_primary = true` explicit on every
   * row (DD-5); portfolio 2 at `lever_role_id = RESEARCH_AREAS_ALIGNMENT`,
   * the same role its own section `save` uses for `research_areas` (DD-9).
   * Same signature discipline as `saveStrategicObjectives` — raw
   * `(resultId, ids)`, no `PortfolioHandlerContext`, no `EntityManager`
   * (DD-3, DD-8) — so "no request-scoped read" and "no threaded
   * transaction" hold by construction.
   */
  saveLevers(resultId: number, ids: number[]): Promise<LeversSaveReport>;
}
