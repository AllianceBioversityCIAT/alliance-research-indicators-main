import {
  Body,
  Controller,
  Get,
  HttpStatus,
  Param,
  Patch,
  Post,
  UseInterceptors,
} from '@nestjs/common';
import { ResultOicrService } from './result-oicr.service';
import { SetUpInterceptor } from '../../shared/Interceptors/setup.interceptor';
import { ApiBearerAuth, ApiBody, ApiParam, ApiTags } from '@nestjs/swagger';
import { GetResultVersion } from '../../shared/decorators/versioning.decorator';
import { RESULT_CODE, ResultsUtil } from '../../shared/utils/results.util';
import { CreateResultOicrDto } from './dto/create-result-oicr.dto';
import { ResponseUtils } from '../../shared/utils/response.utils';
import { UpdateOicrDto } from './dto/update-oicr.dto';

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

  @Post()
  @ApiBody({ type: CreateResultOicrDto })
  async createResultOicr(@Body() data: CreateResultOicrDto) {
    return this.resultOicrService.createOicr(data).then((result) =>
      ResponseUtils.format({
        data: result,
        description: 'Result OICR created successfully',
        status: HttpStatus.CREATED,
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
