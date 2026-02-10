import {
  Body,
  Controller,
  Get,
  HttpStatus,
  Param,
  Post,
  UseInterceptors,
} from '@nestjs/common';
import { ResultStatusWorkflowService } from './result-status-workflow.service';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { SetUpInterceptor } from '../../shared/Interceptors/setup.interceptor';
import { ResponseUtils } from '../../shared/utils/response.utils';
import { GetResultVersion } from '../../shared/decorators/versioning.decorator';
import { RESULT_CODE, ResultsUtil } from '../../shared/utils/results.util';
import { AditionalDataChangeStatusDto } from './dto/aditional-data.dto';

@Controller()
@ApiTags('Results')
@ApiBearerAuth()
@UseInterceptors(SetUpInterceptor)
export class ResultStatusWorkflowController {
  constructor(
    private readonly resultStatusWorkflowService: ResultStatusWorkflowService,
    private readonly _resultsUtil: ResultsUtil,
  ) {}

  @Get(':indicatorId(\\d+)')
  @ApiOperation({
    summary: 'Get workflow by indicator id',
  })
  async getWorkflow(@Param('indicatorId') indicatorId: number) {
    return this.resultStatusWorkflowService
      .getAllStatusesByindicatorId(indicatorId)
      .then((result) =>
        ResponseUtils.format({
          data: result,
          description: 'Workflow found',
          status: HttpStatus.OK,
        }),
      );
  }

  @Get('hierarchical-tree/:indicatorId(\\d+)')
  @ApiOperation({
    summary: 'Get hierarchical tree by indicator id',
  })
  async getHierarchicalTree(@Param('indicatorId') indicatorId: number) {
    return this.resultStatusWorkflowService
      .getHierarchicalTreeByIndicatorId(indicatorId)
      .then((result) =>
        ResponseUtils.format({
          data: result,
          description: 'Hierarchical tree found',
          status: HttpStatus.OK,
        }),
      );
  }

  @Get('config/indicator/:indicatorId(\\d+)/from-status/:fromStatusId(\\d+)')
  @ApiOperation({
    summary: 'Get config workflow by indicator id and from status id',
  })
  async getConfigWorkflow(
    @Param('indicatorId') indicatorId: string,
    @Param('fromStatusId') fromStatusId: string,
  ) {
    return this.resultStatusWorkflowService
      .getConfigWorkflowByIndicatorAndFromStatus(+indicatorId, +fromStatusId)
      .then((result) =>
        ResponseUtils.format({
          data: result,
          description: 'Config workflow found',
          status: HttpStatus.OK,
        }),
      );
  }

  @GetResultVersion()
  @Get(`result/${RESULT_CODE}/next-step`)
  @ApiOperation({
    summary: 'Get next steps by result id',
  })
  async getNextSteps() {
    return this.resultStatusWorkflowService
      .getNextStepsByResultId(this._resultsUtil.resultId)
      .then((result) =>
        ResponseUtils.format({
          data: result,
          description: 'Next steps found',
          status: HttpStatus.OK,
        }),
      );
  }

  @Post(`change-status/${RESULT_CODE}/to-status/:toStatusId(\\d+)`)
  @GetResultVersion()
  @ApiBody({ type: AditionalDataChangeStatusDto })
  @ApiParam({
    name: 'toStatusId',
    description: 'To status id',
    type: Number,
    required: true,
  })
  @ApiOperation({
    summary: 'Change status by result id',
  })
  async changeStatus(
    @Body() body: AditionalDataChangeStatusDto,
    @Param('toStatusId') toStatusId: string,
  ) {
    return this.resultStatusWorkflowService
      .changeStatus(this._resultsUtil.resultId, +toStatusId, body)
      .then((result) =>
        ResponseUtils.format({
          data: result,
          description: 'Status changed',
          status: HttpStatus.OK,
        }),
      );
  }
}
