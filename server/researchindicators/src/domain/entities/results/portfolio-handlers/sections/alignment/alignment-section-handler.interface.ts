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
 * Contract for the alignment section's per-portfolio handlers. Extends the
 * generic `PortfolioSectionHandler` (rather than widening that generic
 * itself — DD-1) with a method scoped to strategic objectives only, so the
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
}
