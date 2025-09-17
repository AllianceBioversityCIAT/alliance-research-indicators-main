import {
  Body,
  Controller,
  Get,
  HttpStatus,
  Patch,
  Query,
  UseInterceptors,
} from '@nestjs/common';
import { ResultOicrService } from './result-oicr.service';
import { SetUpInterceptor } from '../../shared/Interceptors/setup.interceptor';
import { ApiBearerAuth, ApiBody, ApiTags } from '@nestjs/swagger';
import {
  GetResultVersion,
  ParamOrQueryEnum,
} from '../../shared/decorators/versioning.decorator';
import {
  RESULT_CODE,
  RESULT_CODE_PARAM,
  ResultsUtil,
} from '../../shared/utils/results.util';
import { CreateResultOicrDto } from './dto/create-result-oicr.dto';
import { ResponseUtils } from '../../shared/utils/response.utils';
import { UpdateOicrDto } from './dto/update-oicr.dto';
import { isEmpty } from '../../shared/utils/object.utils';
import { ReportingPlatformEnum } from '../results/enum/reporting-platform.enum';

@ApiTags('Results')
@ApiBearerAuth()
@UseInterceptors(SetUpInterceptor)
@Controller()
export class ResultOicrController {
  constructor(
    private readonly resultOicrService: ResultOicrService,
    private readonly resultUtil: ResultsUtil,
  ) {}

  @Patch(`${RESULT_CODE}`)
  @GetResultVersion()
  @ApiBody({ type: UpdateOicrDto })
  async updateResultOicrSteps(@Body() data: UpdateOicrDto) {
    return this.resultOicrService
      .updateOicr(this.resultUtil.resultId, data)
      .then((result) =>
        ResponseUtils.format({
          data: result,
          description: 'Result OICR updated successfully',
          status: HttpStatus.OK,
        }),
      );
  }

  @Get(`${RESULT_CODE}`)
  @GetResultVersion()
  async getResultOicrSteps() {
    return this.resultOicrService
      .findOicrs(this.resultUtil.resultId)
      .then((result) =>
        ResponseUtils.format({
          data: result,
          description: 'Result OICR steps retrieved successfully',
          status: HttpStatus.OK,
        }),
      );
  }

  @Get(`${RESULT_CODE}/modal`)
  @GetResultVersion()
  async getResultOicrModal() {
    return this.resultOicrService
      .findModal(this.resultUtil.resultId)
      .then((result) =>
        ResponseUtils.format({
          data: result,
          description: 'Result OICR modal retrieved successfully',
          status: HttpStatus.OK,
        }),
      );
  }

  @Patch()
  @GetResultVersion(ParamOrQueryEnum.QUERY)
  @ApiBody({ type: CreateResultOicrDto })
  async createResultOicr(
    @Body() data: CreateResultOicrDto,
    @Query(`${RESULT_CODE_PARAM}`) resultCode: string,
  ) {
    return this.resultOicrService
      .createOicr(
        data,
        undefined,
        ReportingPlatformEnum.STAR,
        this.resultUtil.nullResultCode,
      )
      .then((result) =>
        ResponseUtils.format({
          data: result,
          description: isEmpty(resultCode)
            ? 'Result OICR created successfully'
            : 'Result OICR updated successfully',
          status: isEmpty(resultCode) ? HttpStatus.CREATED : HttpStatus.OK,
        }),
      );
  }

  @Get(`details/${RESULT_CODE}`)
  @GetResultVersion()
  async getWordTemplate() {
    return this.resultOicrService
    .getResultOicrDetailsByOfficialCode(this.resultUtil.resultId)
    .then((result) =>
      ResponseUtils.format({
        data: result,
        description: 'Result OICR word template retrieved successfully',
        status: HttpStatus.OK,
      }),
    );
  }

}
