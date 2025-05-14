import { applyDecorators } from '@nestjs/common';
import { ApiParam, ApiQuery } from '@nestjs/swagger';
import { REPORT_YEAR_PARAM, RESULT_CODE_PARAM } from '../utils/results.util';

export function GetResultVersion(
  config: ParamOrQueryEnum = ParamOrQueryEnum.PARAM,
) {
  const dataResultConfig = {
    name: RESULT_CODE_PARAM,
    required: true,
    type: Number,
    description: 'Is a reference to the result Code',
  };

  let resultDecorator: MethodDecorator & ClassDecorator = null;

  if (config === ParamOrQueryEnum.QUERY)
    resultDecorator = ApiQuery(dataResultConfig);
  else resultDecorator = ApiParam(dataResultConfig);

  return applyDecorators(
    resultDecorator,
    ApiQuery({
      name: REPORT_YEAR_PARAM,
      required: false,
      type: Number,
      description: 'Is a reference to the report year',
    }),
  );
}

export enum ParamOrQueryEnum {
  PARAM,
  QUERY,
}
