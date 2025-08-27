import { applyDecorators } from '@nestjs/common';
import { ApiParam, ApiQuery } from '@nestjs/swagger';
import {
  REPORT_YEAR_PARAM,
  RESULT_CODE_PARAM,
  REPORTING_PLATFORMS,
} from '../utils/results.util';
import { ReportingPlatformEnum } from '../../entities/results/enum/reporting-platform.enum';

export function GetResultVersion(
  config: ParamOrQueryEnum = ParamOrQueryEnum.PARAM,
) {
  const dataResultConfig = {
    name: RESULT_CODE_PARAM,
    required: config === ParamOrQueryEnum.PARAM,
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
      name: REPORTING_PLATFORMS,
      required: false,
      type: String,
      enum: ReportingPlatformEnum,
    }),
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
