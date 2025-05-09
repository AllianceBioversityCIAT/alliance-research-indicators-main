import { applyDecorators } from '@nestjs/common';
import { ApiParam, ApiQuery } from '@nestjs/swagger';
import { REPORT_YEAR_PARAM, RESULT_CODE_PARAM } from '../utils/results.util';

export function GetResultVersion() {
  return applyDecorators(
    ApiParam({
      name: RESULT_CODE_PARAM,
      required: true,
      type: Number,
      description: 'Is a reference to the result Code',
    }),
    ApiQuery({
      name: REPORT_YEAR_PARAM,
      required: false,
      type: Number,
      description: 'Is a reference to the report year',
    }),
  );
}
