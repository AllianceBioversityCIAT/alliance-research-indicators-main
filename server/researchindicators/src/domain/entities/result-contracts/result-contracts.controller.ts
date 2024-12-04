import { Controller, Get, Param } from '@nestjs/common';
import { ResultContractsService } from './result-contracts.service';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { ResponseUtils } from '../../shared/utils/response.utils';

@ApiTags('Results Contracts')
@ApiBearerAuth()
@Controller()
export class ResultContractsController {
  constructor(
    private readonly resultContractsService: ResultContractsService,
  ) {}

  @ApiOperation({ summary: 'Find all results by contract id' })
  @ApiParam({
    name: 'contractId',
    required: true,
    description: 'Contract ID',
  })
  @Get(':contractId')
  async findAllResultsByContractId(@Param('contractId') contractId: string) {
    return this.resultContractsService
      .findAllResultByContractId(contractId)
      .then((response) =>
        ResponseUtils.format({
          description: 'Results found',
          status: 200,
          data: response,
        }),
      );
  }
}
