import { applyDecorators } from '@nestjs/common';
import { ApiQuery } from '@nestjs/swagger';

const DEFAULT_CONTRACT_ID_DESCRIPTION =
  'Contract agreement id to filter results (primary contract)';

export type ApiContractReportQueriesOptions = {
  contractIdDescription?: string;
  limitDescription?: string;
};

export function ApiContractReportQueries(
  options: ApiContractReportQueriesOptions = {},
) {
  const decorators = [
    ApiQuery({
      name: 'contract-id',
      required: true,
      type: String,
      description:
        options.contractIdDescription ?? DEFAULT_CONTRACT_ID_DESCRIPTION,
    }),
  ];

  if (options.limitDescription) {
    decorators.push(
      ApiQuery({
        name: 'limit',
        required: false,
        type: Number,
        description: options.limitDescription,
        example: 10,
      }),
    );
  }

  return applyDecorators(...decorators);
}
