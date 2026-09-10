import {
  Body,
  Controller,
  Get,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  UseGuards,
  UseInterceptors,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { ResultInnovationUseService } from './result-innovation-use.service';
import { CreateResultInnovationUseDto } from './dto/create-result-innovation-use.dto';
import { InnovationDevCardFactsDto } from './dto/innovation-dev-card-facts.dto';
import { SetUpInterceptor } from '../../shared/Interceptors/setup.interceptor';
import {
  RESULT_CODE,
  RESULT_CODE_PARAM,
  ResultsUtil,
} from '../../shared/utils/results.util';
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

  /**
   * `docs/specs/innovation-use/dev-card-details` T-04 (`design.md` §4.2,
   * §2.1; `R-IUC-007` the server half, `R-IUC-008` AC.1-AC.5).
   *
   * **Literal segment first, declared before the bare `${RESULT_CODE}`
   * route below.** The controller's only other `@Get` is the bare
   * `:resultCode(\d+)` at the controller root — a request to
   * `innovation-dev-card/123` has two path segments and can never match a
   * pattern that expects exactly one, so this cannot collide with (or be
   * shadowed by) that handler regardless of declaration order. Declared
   * above it anyway, matching `design.md`'s literal-first rule.
   *
   * **No `@GetResultVersion()`.** That decorator documents `reportYear`
   * and `reportingPlatforms` query params that belong to the **current**
   * result context (`SetUpInterceptor` → `ResultsUtil.setup()`, which this
   * handler never reads from). This endpoint accepts one id and nothing
   * else (`R-IUC-008` AC.4) — `@ApiParam` below documents only that.
   *
   * **No `@Roles(...)`, no `ResultStatusGuard`** — matching `findOne`'s
   * posture below, per `design.md` §4.2.
   *
   * **`ParseIntPipe` is load-bearing, not decorative.** The bounding
   * check in `readInnovationDevCardFactsForTarget` does
   * `matches.includes(resultId)`, a strict `===` over the numeric
   * `result_id`s `filterResultByIndicators` returns. The `(\d+)` route
   * regex constrains the character set but does **not** coerce the
   * captured param to a number — without this pipe, `resultCode` arrives
   * as the *string* `'950'`, `[950].includes('950')` is `false`, and every
   * valid target would silently return all-null facts while nothing
   * throws (see the controller spec's dedicated regression test).
   *
   * **`result_id` in the response is the path param, never a fetched
   * row.** A row can only echo an id that exists; echoing the param keeps
   * the unknown-id and out-of-bounds responses byte-identical
   * (`R-IUC-008` AC.9, `design.md` §4.2 finding #4).
   */
  @Get(`innovation-dev-card/${RESULT_CODE}`)
  @ApiOperation({
    summary:
      "Get the linked Innovation Development result's card facts (readiness, description, geographic scope) for one result id",
  })
  @ApiParam({
    name: RESULT_CODE_PARAM,
    type: Number,
    description: 'Innovation Development result id',
  })
  @ApiOkResponse({ type: InnovationDevCardFactsDto })
  async getInnovationDevCardFacts(
    @Param(RESULT_CODE_PARAM, ParseIntPipe) resultCode: number,
  ) {
    const facts =
      await this.resultInnovationUseService.readInnovationDevCardFactsForTarget(
        resultCode,
      );

    return ResponseUtils.format({
      description: 'Innovation Development card facts retrieved successfully',
      data: {
        result_id: resultCode,
        innovation_readiness: facts.innovation_readiness,
        description: facts.description,
        geo_scope: facts.geo_scope,
      },
      status: HttpStatus.OK,
    });
  }

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
