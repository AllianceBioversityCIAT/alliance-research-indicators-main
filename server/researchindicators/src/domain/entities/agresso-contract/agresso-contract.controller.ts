import {
  Body,
  Controller,
  Get,
  HttpStatus,
  Param,
  Patch,
  Query,
  UseGuards,
  UsePipes,
  ValidationPipe,
  Version,
} from '@nestjs/common';
import { AgressoContractService } from './agresso-contract.service';
import { AgressoContractStatus } from '../../shared/enum/agresso-contract.enum';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { ApiContractReportQueries } from './decorators/api-contract-report-queries.decorator';
import { ResponseUtils } from '../../shared/utils/response.utils';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { AgressoFindNamePayload } from './dto/agresso-find-options.payload';
import { ServiceResponseDto } from '../../shared/global-dto/service-response.dto';
import { AgressoContract } from './entities/agresso-contract.entity';
import { TrueFalseEnum } from '../../shared/enum/queries.enum';
import { ListParseToArrayPipe } from '../../shared/pipes/list-parse-array.pipe';
import { OrderFieldsEnum } from './enum/order-fields.enum';
import { isEmpty } from '../../shared/utils/object.utils';
import { PoolFundingTagDto } from './dto/pool-funding-tag.dto';
import { Roles } from '../../shared/decorators/roles.decorator';
import { SecRolesEnum } from '../../shared/enum/sec_role.enum';
import { RolesGuard } from '../../shared/guards/roles.guard';
import { QueryParseBool } from '../../shared/pipes/query-parse-boolean.pipe';

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
  @ApiQuery({
    name: 'pool-funding-contributor',
    required: false,
    type: Boolean,
    description: 'Filter by pool funding contributor tag',
  })
  @ApiOperation({ summary: 'Find all contracts', deprecated: true })
  find(
    @Query('project') project: string,
    @Query('funding_type') fundingType: string,
    @Query('contract_status') contractStatus: AgressoContractStatus,
    @Query('page') page: string,
    @Query('limit') limit: string,
    @Query('show_countries') showCountries: string,
    @Query('pool-funding-contributor') poolFundingContributor: TrueFalseEnum,
  ) {
    return this.agressoContractService
      .findContracts(
        {
          agreement_id: project,
          funding_type: fundingType,
          contract_status: contractStatus,
          is_pool_funding_contributor: this.parseOptionalBoolean(
            poolFundingContributor,
          ),
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

  @Get('reports/top-primary-levers')
  @ApiOperation({
    summary: 'Top primary levers for results linked to a primary contract',
  })
  @ApiContractReportQueries({ limitDescription: 'Top N primary levers' })
  async getTopPrimaryLeversReport(
    @Query('contract-id') contractId: string,
    @Query('limit') limit?: string,
  ) {
    const parsedLimit = isEmpty(limit) ? undefined : Number(limit);

    return this.agressoContractService
      .getTopPrimaryLeversReport(contractId, parsedLimit)
      .then((response) =>
        ResponseUtils.format({
          description: 'Contract top primary levers report generated',
          status: HttpStatus.OK,
          data: response,
        }),
      );
  }

  @Get('reports/top-contributors-contracts')
  @ApiOperation({
    summary:
      'Top contributor contracts linked to results where the given contract is primary',
  })
  @ApiContractReportQueries({
    contractIdDescription:
      'Primary contract agreement id used to filter results',
    limitDescription: 'Top N contributor contracts',
  })
  async getTopContributorsReport(
    @Query('contract-id') contractId: string,
    @Query('limit') limit?: string,
  ) {
    const parsedLimit = isEmpty(limit) ? undefined : Number(limit);

    return this.agressoContractService
      .getTopContributorsReport(contractId, parsedLimit)
      .then((response) =>
        ResponseUtils.format({
          description: 'Contract top contributors report generated',
          status: HttpStatus.OK,
          data: response,
        }),
      );
  }

  @Get('reports/top-main-contact-persons')
  @ApiOperation({
    summary:
      'Top main contact persons for results linked to a primary contract',
  })
  @ApiContractReportQueries({
    limitDescription: 'Top N main contact persons',
  })
  async getTopMainContactPersonsReport(
    @Query('contract-id') contractId: string,
    @Query('limit') limit?: string,
  ) {
    const parsedLimit = isEmpty(limit) ? undefined : Number(limit);

    return this.agressoContractService
      .getTopMainContactPersonsReport(contractId, parsedLimit)
      .then((response) =>
        ResponseUtils.format({
          description: 'Contract top main contact persons report generated',
          status: HttpStatus.OK,
          data: response,
        }),
      );
  }

  @Get('reports/contract-staff')
  @ApiOperation({
    summary: 'Project staff members assigned to a contract',
  })
  @ApiContractReportQueries({
    contractIdDescription: 'Contract agreement id',
  })
  async getContractStaffReport(@Query('contract-id') contractId: string) {
    return this.agressoContractService
      .getContractStaffReport(contractId)
      .then((response) =>
        ResponseUtils.format({
          description: 'Contract staff report generated',
          status: HttpStatus.OK,
          data: response,
        }),
      );
  }

  @Get('reports/top-partners')
  @ApiOperation({
    summary:
      'Top partner institutions for results linked to a primary contract',
  })
  @ApiContractReportQueries({
    limitDescription: 'Top N partner institutions',
  })
  async getTopPartnersReport(
    @Query('contract-id') contractId: string,
    @Query('limit') limit?: string,
  ) {
    const parsedLimit = isEmpty(limit) ? undefined : Number(limit);

    return this.agressoContractService
      .getTopPartnersReport(contractId, parsedLimit)
      .then((response) =>
        ResponseUtils.format({
          description: 'Contract top partners report generated',
          status: HttpStatus.OK,
          data: response,
        }),
      );
  }

  @Get('reports/geo-scope')
  @ApiOperation({
    summary: 'Geographic scope report for results linked to a primary contract',
  })
  @ApiContractReportQueries({
    limitDescription:
      'Top N regions, countries and sub-nationals per country',
  })
  async getGeoScopeReport(
    @Query('contract-id') contractId: string,
    @Query('limit') limit?: string,
  ) {
    const parsedLimit = isEmpty(limit) ? undefined : Number(limit);

    return this.agressoContractService
      .getGeoScopeReport(contractId, parsedLimit)
      .then((response) =>
        ResponseUtils.format({
          description: 'Contract geographic scope report generated',
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
    name: 'with-indicators',
    required: false,
    description: 'Filter by indicators',
    enum: TrueFalseEnum,
    default: TrueFalseEnum.TRUE,
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
    description:
      'Field to order by (count-results = total active results per contract)',
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
    name: 'exclude-pooled-funding',
    required: false,
    description: 'Exclude pooled funding contracts from results',
    enum: TrueFalseEnum,
  })
  @ApiQuery({
    name: 'pool-funding-contributor',
    required: false,
    type: Boolean,
    description: 'Filter by pool funding contributor tag',
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
    @Query('exclude-pooled-funding') excludePooledFunding: TrueFalseEnum,
    @Query('with-indicators')
    withIndicators: TrueFalseEnum = TrueFalseEnum.TRUE,
    @Query('pool-funding-contributor') poolFundingContributor: TrueFalseEnum,
  ) {
    if (isEmpty(withIndicators)) withIndicators = TrueFalseEnum.TRUE; //TODO: Remove this once a pipe is implemented in the query parameter
    return this.agressoContractService
      .findAgressoContracts(
        currentUser,
        {
          with_indicators: withIndicators == TrueFalseEnum.TRUE,
          contract_code: contractCode,
          project_name: projectName,
          principal_investigator: principalInvestigator,
          lever: lever,
          start_date: startDate,
          end_date: endDate,
          status: status.map((s) => AgressoContractStatus[s?.toUpperCase()]),
          exclude_pooled_funding: excludePooledFunding == TrueFalseEnum.TRUE,
          is_pool_funding_contributor: this.parseOptionalBoolean(
            poolFundingContributor,
          ),
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

  private parseOptionalBoolean(value?: TrueFalseEnum): boolean | undefined {
    return isEmpty(value) ? undefined : new QueryParseBool().transform(value);
  }

  @Patch(':code/pool-funding-tag')
  @Version('1')
  @ApiOperation({ summary: 'Update the pool funding contributor tag' })
  @ApiParam({
    name: 'code',
    type: String,
    description: 'AGRESSO contract code',
  })
  @ApiBody({
    type: PoolFundingTagDto,
    description: 'Pool funding contributor tag payload',
  })
  @Roles(SecRolesEnum.CENTER_ADMIN, SecRolesEnum.SYSTEM_ADMIN)
  @UseGuards(RolesGuard)
  @UsePipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  )
  async updatePoolFundingTag(
    @Param('code') contractCode: string,
    @Body() payload: PoolFundingTagDto,
  ) {
    return this.agressoContractService
      .setPoolFundingTag(contractCode, payload.is_pool_funding_contributor)
      .then((response) =>
        ResponseUtils.format({
          description: 'Pool funding contributor tag updated',
          status: HttpStatus.OK,
          data: response,
        }),
      );
  }
}
