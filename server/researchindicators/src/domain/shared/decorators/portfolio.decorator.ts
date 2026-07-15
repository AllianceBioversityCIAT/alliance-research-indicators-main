import { ApiParam, ApiQuery } from '@nestjs/swagger';
import { ParamOrQueryEnum } from './versioning.decorator';
import { applyDecorators } from '@nestjs/common';
import { REPORT_YEAR_PARAM } from '../utils/results.util';

export function getPortfolio(
  config: ParamOrQueryEnum = ParamOrQueryEnum.PARAM,
  addYear: boolean = false,
) {
  const dataPortfolioConfig = {
    name: PORTFOLIO_ID_PARAM,
    required: config === ParamOrQueryEnum.PARAM,
    type: Number,
    description: 'Is a reference to the portfolio id',
  };

  let portfolioDecorator: MethodDecorator & ClassDecorator = null;

  if (config === ParamOrQueryEnum.QUERY)
    portfolioDecorator = ApiQuery(dataPortfolioConfig);
  else portfolioDecorator = ApiParam(dataPortfolioConfig);

  const decorators = [portfolioDecorator];

  if (addYear) {
    decorators.push(
      ApiQuery({
        name: REPORT_YEAR_PARAM,
        required: false,
        type: Number,
        description: 'Is a reference to the report year',
      }),
    );
  }

  return applyDecorators(...decorators);
}

export const PORTFOLIO_ID = ':portfolioId(\\d+)';
export const PORTFOLIO_ID_PARAM = 'portfolioId';
