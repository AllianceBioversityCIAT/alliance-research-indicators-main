import {
  Body,
  Controller,
  Get,
  HttpStatus,
  Param,
  Patch,
  UseGuards,
} from '@nestjs/common';
import { ResultPolicyChangeService } from './result-policy-change.service';
import { CreateResultPolicyChangeDto } from './dto/create-result-policy-change.dto';
import { ResponseUtils } from '../../shared/utils/response.utils';
import { ApiBearerAuth, ApiParam, ApiTags } from '@nestjs/swagger';
import { ResultStatusGuard } from '../../shared/guards/result-status.guard';

@ApiTags('Policy Change')
@ApiBearerAuth()
@Controller()
export class ResultPolicyChangeController {
  constructor(
    private readonly resultPolicyChangeService: ResultPolicyChangeService,
  ) {}

  @UseGuards(ResultStatusGuard)
  @Patch('by-result-id/:resultId')
  async updateByResultId(
    @Param('resultId') resultId: string,
    @Body() CreatePolicyChange: CreateResultPolicyChangeDto,
  ) {
    return this.resultPolicyChangeService
      .update(+resultId, CreatePolicyChange)
      .then((result) =>
        ResponseUtils.format({
          description: 'Result policy change updated',
          status: HttpStatus.OK,
          data: result,
        }),
      );
  }

  @ApiParam({
    name: 'resultId',
    required: true,
    description: 'Result id',
  })
  @Get('by-result-id/:resultId')
  async getByResultId(@Param('resultId') resultId: string) {
    return this.resultPolicyChangeService
      .findPolicyChange(+resultId)
      .then((result) =>
        ResponseUtils.format({
          description: 'Result policy change found',
          status: HttpStatus.OK,
          data: result,
        }),
      );
  }
}
