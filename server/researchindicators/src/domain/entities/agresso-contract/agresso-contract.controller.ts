import { Controller, Get, Query, HttpStatus } from '@nestjs/common';
import { AgressoContractService } from './agresso-contract.service';
import { AgressoContractStatus } from '../../shared/enum/agresso-contract.enum';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { ResponseUtils } from '../../shared/utils/response.utils';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { AgressoFindNamePayload } from './dto/agresso-find-options.payload';
import { ServiceResponseDto } from '../../shared/global-dto/service-response.dto';
import { AgressoContract } from './entities/agresso-contract.entity';

@ApiTags('Agresso Contracts')
@Controller()
@ApiBearerAuth()
export class AgressoContractController {
  constructor(
    private readonly agressoContractService: AgressoContractService,
  ) {}

  @Get('contracts')
  @ApiQuery({ name: 'project', required: false, description: 'Project ID' })
  @ApiQuery({
    name: 'funding_type',
    required: false,
    description: 'Funding type',
  })
  @ApiQuery({
    name: 'contract_status',
    required: false,
    description: 'Contract status',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    description: 'Is a reference to the page number',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Is a reference to the limit of items per page',
  })
  @ApiQuery({
    name: 'show_countries',
    required: false,
    description: 'Show countries',
  })
  @ApiOperation({ summary: 'Find all contracts' })
  find(
    @Query('project') project: string,
    @Query('funding_type') fundingType: string,
    @Query('contract_status') contractStatus: AgressoContractStatus,
    @Query('page') page: string,
    @Query('limit') limit: string,
    @Query('show_countries') showCountries: string,
  ) {
    return this.agressoContractService
      .findContracts(
        {
          agreement_id: project,
          funding_type: fundingType,
          contract_status: contractStatus,
        },
        {
          limit: +limit,
          page: +page,
        },
        {
          countries: showCountries,
        },
      )
      .then((response) =>
        ResponseUtils.format({
          description: 'Contracts found',
          status: HttpStatus.OK,
          data: response,
        }),
      );
  }

  @MessagePattern('find-contracts-by-name')
  async findAgreementById(
    @Payload() options: AgressoFindNamePayload,
  ): Promise<ServiceResponseDto<AgressoContract[]>> {
    const { first_name, last_name } = options;
    return this.agressoContractService
      .findByName(first_name, last_name)
      .then((response) =>
        ResponseUtils.format({
          description: 'Contracts found',
          status: HttpStatus.OK,
          data: response,
        }),
      );
  }
}
