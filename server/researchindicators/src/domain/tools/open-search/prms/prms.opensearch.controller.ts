import {
  Controller,
  DefaultValuePipe,
  Get,
  HttpStatus,
  Query,
  UseGuards,
} from '@nestjs/common';
import { PrmsOpenSearchService } from './prms.opensearch.service';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { RolesGuard } from '../../../shared/guards/roles.guard';
import { Roles } from '../../../shared/decorators/roles.decorator';
import { SecRolesEnum } from '../../../shared/enum/sec_role.enum';
import { ResponseUtils } from '../../../shared/utils/response.utils';
import { TrueFalseEnum } from '../../../shared/enum/queries.enum';
import { PrmsSearchParams } from './dto/prms-response.dto';

@ApiTags('OpenSearch')
@Controller()
@ApiBearerAuth()
export class PrmsOpenSearchController {
  constructor(private readonly prmsService: PrmsOpenSearchService) {}

  @Get('fetch-prms-data')
  @ApiQuery({
    name: 'year',
    required: false,
    type: Number,
  })
  @ApiQuery({
    name: 'async',
    required: false,
    type: String,
    enum: TrueFalseEnum,
  })
  @UseGuards(RolesGuard)
  @Roles(SecRolesEnum.TECHNICAL_SUPPORT)
  async fetchPrmsData(
    @Query('year') year: string,
    @Query('async', new DefaultValuePipe(TrueFalseEnum.FALSE))
    async: TrueFalseEnum,
  ) {
    if (async == TrueFalseEnum.TRUE) {
      this.prmsService.getData(+year);
      return ResponseUtils.format({
        data: 'Prms data fetched asynchronously',
        description: 'Prms data fetched asynchronously',
        status: HttpStatus.OK,
      });
    }

    return this.prmsService.getData(+year).then((response) => {
      return ResponseUtils.format({
        data: response,
        description: 'Prms data fetched',
        status: HttpStatus.OK,
      });
    });
  }
  @Get('fetch-prms-data-as-star')
  @ApiOperation({
    summary:
      'Imports PRMS results as STAR results, creating or updating by PRMS result code',
  })
  @ApiQuery({ name: 'year', required: false, type: Number, example: 2025 })
  @ApiQuery({
    name: 'centerAcronym',
    required: false,
    type: String,
    description: 'Comma-separated center acronyms',
    example: 'Bioversity (Alliance),CIAT (Alliance)',
  })
  @ApiQuery({
    name: 'resultType',
    required: false,
    type: String,
    example: 'knowledge_product,policy_change',
  })
  @ApiQuery({ name: 'resultCode', required: false, type: String })
  @ApiQuery({
    name: 'source',
    required: false,
    type: String,
    example: 'W3/Bilateral',
  })
  @ApiQuery({
    name: 'fundingType',
    required: false,
    type: String,
    example: 'Result',
  })
  @ApiQuery({
    name: 'statusId',
    required: false,
    type: String,
    description:
      'PRMS status ids, comma-separated. Only 5, 6 and 7 are imported (all as Approved); any other status is skipped',
    example: '5,6,7',
  })
  @ApiQuery({
    name: 'async',
    required: false,
    type: String,
    enum: TrueFalseEnum,
  })
  @UseGuards(RolesGuard)
  @Roles(SecRolesEnum.SYSTEM_ADMIN)
  async fetchPrmsDataAsStar(
    @Query('year') year: string,
    @Query('centerAcronym') centerAcronym: string,
    @Query('resultType') resultType: string,
    @Query('resultCode') resultCode: string,
    @Query('source') source: string,
    @Query('fundingType') fundingType: string,
    @Query('statusId') statusId: string,
    @Query('async', new DefaultValuePipe(TrueFalseEnum.FALSE))
    async: TrueFalseEnum,
  ) {
    const params: PrmsSearchParams = {
      year,
      centerAcronym,
      resultType,
      resultCode,
      source,
      fundingType,
      statusId,
    };

    if (async == TrueFalseEnum.TRUE) {
      this.prmsService.getDataAsStar(params);
      return ResponseUtils.format({
        data: 'Prms data fetched as STAR asynchronously',
        description: 'Prms data fetched as STAR asynchronously',
        status: HttpStatus.OK,
      });
    }

    return this.prmsService.getDataAsStar(params).then((response) => {
      return ResponseUtils.format({
        data: response,
        description: 'Prms data fetched as STAR',
        status: HttpStatus.OK,
      });
    });
  }
}
