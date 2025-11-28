import { Controller, Get, Query, HttpStatus, Param } from '@nestjs/common';
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
import { TrueFalseEnum } from '../../shared/enum/queries.enum';
import { ListParseToArrayPipe } from '../../shared/pipes/list-parse-array.pipe';
import { OrderFieldsEnum } from './enum/order-fields.enum';

@ApiTags('Agresso Contracts')
@Controller()
@ApiBearerAuth()
export class AgressoContractController {
  constructor(
    private readonly agressoContractService: AgressoContractService,
  ) {}

  @Get()
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
  @ApiOperation({ summary: 'Find all contracts', deprecated: true })
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

  @Get('results/current-user')
  @ApiOperation({ summary: 'Find all contracts by current user' })
  async findContractsByCurrentUser() {
    return this.agressoContractService
      .findContractsResultByCurrentUser()
      .then((response) =>
        ResponseUtils.format({
          description: 'Contracts found',
          status: HttpStatus.OK,
          data: response,
        }),
      );
  }

  @Get(':contractId/results/count')
  @ApiOperation({ summary: 'Find all contracts by contract id' })
  async findContractsByContractId(@Param('contractId') contractId: string) {
    return this.agressoContractService
      .findContratResultByContractId(contractId)
      .then((response) =>
        ResponseUtils.format({
          description: 'Contracts found',
          status: HttpStatus.OK,
          data: response,
        }),
      );
  }

  @Get('find-contracts')
  @ApiOperation({ summary: 'Find all agresso contracts' })
  @ApiQuery({
    name: 'current-user',
    required: false,
    description: 'Filter contracts by current user',
    enum: TrueFalseEnum,
  })
  @ApiQuery({
    name: 'contract-code',
    required: false,
    type: String,
    description: 'Filter by contract code',
  })
  @ApiQuery({
    name: 'project-name',
    required: false,
    type: String,
    description: 'Filter by project name',
  })
  @ApiQuery({
    name: 'principal-investigator',
    required: false,
    type: String,
    description: 'Filter by principal investigator',
  })
  @ApiQuery({
    name: 'lever',
    required: false,
    type: Number,
    description: 'Filter by lever',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: AgressoContractStatus,
    description: 'Filter by contract status',
  })
  @ApiQuery({
    name: 'start-date',
    required: false,
    type: String,
    description: 'Filter by start date',
  })
  @ApiQuery({
    name: 'end-date',
    required: false,
    type: String,
    description: 'Filter by end date',
  })
  @ApiQuery({
    name: 'order-field',
    required: false,
    enum: OrderFieldsEnum,
    description: 'Field to order by',
  })
  @ApiQuery({
    name: 'direction',
    required: false,
    description: 'Order direction (ASC or DESC)',
    enum: ['ASC', 'DESC'],
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Page number for pagination',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Number of items per page for pagination',
  })
  @ApiQuery({
    name: 'query',
    required: false,
    type: String,
    description: 'Search query to filter results',
  })
  @ApiQuery({
    name: 'exclude-pulled-funding',
    required: false,
    description: 'Exclude pooled funding contracts from results',
    enum: TrueFalseEnum,
  })
  async findContracts(
    @Query('current-user') currentUser: TrueFalseEnum,
    @Query('contract-code') contractCode: string,
    @Query('project-name') projectName: string,
    @Query('principal-investigator') principalInvestigator: string,
    @Query('lever', ListParseToArrayPipe) lever: string[],
    @Query('status', ListParseToArrayPipe) status: AgressoContractStatus[],
    @Query('start-date') startDate: string,
    @Query('end-date') endDate: string,
    @Query('order-field') orderField: OrderFieldsEnum,
    @Query('page') page: string,
    @Query('limit') limit: string,
    @Query('query') query: string,
    @Query('direction') direction: 'ASC' | 'DESC' = 'ASC',
    @Query('exclude-pulled-funding') excludePooledFunding: TrueFalseEnum,
  ) {
    return this.agressoContractService
      .findAgressoContracts(
        currentUser,
        {
          contract_code: contractCode,
          project_name: projectName,
          principal_investigator: principalInvestigator,
          lever: lever,
          start_date: startDate,
          end_date: endDate,
          status: status.map((s) => AgressoContractStatus[s?.toUpperCase()]),
          exclude_pooled_funding: excludePooledFunding == TrueFalseEnum.TRUE,
        },
        orderField,
        direction,
        { limit: +limit, page: +page },
        query,
      )
      .then((response) =>
        ResponseUtils.format({
          description: 'Contracts found',
          status: HttpStatus.OK,
          data: response,
        }),
      );
  }
}
