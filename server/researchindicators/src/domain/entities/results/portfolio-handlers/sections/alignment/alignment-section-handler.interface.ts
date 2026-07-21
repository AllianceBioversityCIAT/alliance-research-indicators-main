import { ResultAlignmentDto } from '../../../dto/result-alignment.dto';
import { PortfolioSectionHandler } from '../../core/portfolio-section-handler.interface';

/** Alignment view — adjust when defining the shape per portfolio. */
export type AlignmentSectionView = ResultAlignmentDto;

export type AlignmentSectionHandler = PortfolioSectionHandler<
  ResultAlignmentDto,
  AlignmentSectionView
>;
