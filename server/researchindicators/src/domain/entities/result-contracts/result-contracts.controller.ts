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
    name: 'contract_id',
    required: true,
    description: 'Contract ID',
  })
  @Get(':contract_id')
  async findAllResultsByContractId(@Param('contract_id') contract_id: string) {
    return this.resultContractsService
      .findAllResultByContractId(contract_id)
      .then((response) =>
        ResponseUtils.format({
          description: 'Results found',
          status: 200,
          data: response,
        }),
      );
  }
}
