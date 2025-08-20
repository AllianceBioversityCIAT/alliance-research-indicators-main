import {
  Body,
  Controller,
  Get,
  ParseIntPipe,
  Patch,
  Query,
  UseInterceptors,
} from '@nestjs/common';
import { ResultOicrService } from './result-oicr.service';
import { SetUpInterceptor } from '../../shared/Interceptors/setup.interceptor';
import { ApiBearerAuth, ApiBody, ApiTags } from '@nestjs/swagger';
import { GetResultVersion } from '../../shared/decorators/versioning.decorator';
import { RESULT_CODE, ResultsUtil } from '../../shared/utils/results.util';
import { CreateStepsOicrDto } from './dto/create-steps-oicr.dto';

@Controller('result-oicr')
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
  @ApiBody({ type: Object })
  async updateResultOicrSteps(
    @Body() data: CreateStepsOicrDto,
    @Query('step', ParseIntPipe) step: number,
  ) {
    return this.resultOicrService.createOicrSteps(
      this.resultUtil.resultId,
      data,
      step,
    );
  }

  @Get(`${RESULT_CODE}`)
  @GetResultVersion()
  async getResultOicrSteps(@Query('step', ParseIntPipe) step: number) {
    return this.resultOicrService.findByResultIdAndSteps(
      this.resultUtil.resultId,
      step,
    );
  }
}
