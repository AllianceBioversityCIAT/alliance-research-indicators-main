import {
  Body,
  Controller,
  Get,
  HttpStatus,
  Patch,
  UseGuards,
  UseInterceptors,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ResultInnovationUseService } from './result-innovation-use.service';
import { CreateResultInnovationUseDto } from './dto/create-result-innovation-use.dto';
import { SetUpInterceptor } from '../../shared/Interceptors/setup.interceptor';
import { RESULT_CODE, ResultsUtil } from '../../shared/utils/results.util';
import { ResponseUtils } from '../../shared/utils/response.utils';
import { GetResultVersion } from '../../shared/decorators/versioning.decorator';
import { ResultStatusGuard } from '../../shared/guards/result-status.guard';

/**
 * T-07 (R-IUA-013, R-IUA-002 AC.7, R-IUA-003 AC.5, R-IUA-004 AC.1-AC.8
 * behaviorally). Mirrors `result-innovation-dev.controller.ts`'s
 * `@Get`/`@Patch` pair on `RESULT_CODE`, plus the Swagger decorators the
 * reference omits and the per-handler `ValidationPipe` this repo has no
 * global equivalent of (DD-8, `design.md` §4). `forbidNonWhitelisted` is
 * deliberately **not** set — it would reject a body carrying `total`,
 * contradicting R-IUA-004 AC.5, which requires it be ignored, not rejected.
 * No `@Roles(...)` (DD-5): section access is JWT + `ResultStatusGuard` only.
 */
@ApiTags('Results Innovation Use')
@ApiBearerAuth()
@UseInterceptors(SetUpInterceptor)
@Controller()
export class ResultInnovationUseController {
  constructor(
    private readonly resultInnovationUseService: ResultInnovationUseService,
    private readonly _currentResult: ResultsUtil,
  ) {}

  @Get(`${RESULT_CODE}`)
  @GetResultVersion()
  @ApiOperation({ summary: 'Get the Innovation Use section of a result' })
  findOne() {
    return this.resultInnovationUseService
      .findOne(this._currentResult.resultId)
      .then((res) =>
        ResponseUtils.format({
          description: 'Result Innovation Use retrieved successfully',
          data: res,
          status: HttpStatus.OK,
        }),
      );
  }

  @Patch(`${RESULT_CODE}`)
  @GetResultVersion()
  @UseGuards(ResultStatusGuard)
  @ApiOperation({ summary: 'Update the Innovation Use section of a result' })
  @ApiBody({ type: CreateResultInnovationUseDto })
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  update(@Body() createResultInnovationUseDto: CreateResultInnovationUseDto) {
    return this.resultInnovationUseService
      .update(this._currentResult.resultId, createResultInnovationUseDto)
      .then((res) =>
        ResponseUtils.format({
          description: 'Result Innovation Use updated successfully',
          data: res,
          status: HttpStatus.OK,
        }),
      );
  }
}
