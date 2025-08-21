import {
  Body,
  Controller,
  Delete,
  Get,
  HttpStatus,
  Param,
  Post,
  UseInterceptors,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { SetUpInterceptor } from '../../shared/Interceptors/setup.interceptor';
import { ProjectIndicatorsResultsService } from './project_indicators_results.service';
import { SyncProjectIndicatorsResultDto } from './dto/sync-project_indicators_result.dto';
import { ResponseUtils } from '../../shared/utils/response.utils';

@ApiTags('project-indicators-results')
@ApiBearerAuth()
@UseInterceptors(SetUpInterceptor)
@Controller()
export class ProjectIndicatorsResultsController {

  constructor(
    private readonly indicatorsResultsService: ProjectIndicatorsResultsService
  ) {}

  @Post('sync-contribution')
  async createResult(@Body() dtos: SyncProjectIndicatorsResultDto[]) {
    return await this.indicatorsResultsService
      .syncResultToIndicator(dtos)
      .then((data) =>
        ResponseUtils.format({
          description: 'Contributions synced successfully',
          status: HttpStatus.CREATED,
          data: data,
        }),
      );
  }

  @Get('by-result/:resultId/:agreementId')
  async findByResultId(
    @Param('resultId') resultId: number,
    @Param('agreementId') agreementId: string,
  ) {
    return await this.indicatorsResultsService
    .findByResultId(resultId, agreementId)
    .then((data) =>
        ResponseUtils.format({
          description: 'Contributions retrieved successfully',
          status: HttpStatus.OK,
          data: data,
        }),
      );
  }

  @Delete('delete/:contributionId')
  async deleteContribution(@Param('contributionId') id: number) {
    return await this.indicatorsResultsService
      .deleteContribution(id)
      .then((data) =>
        ResponseUtils.format({
          description: 'Contribution deleted',
          status: HttpStatus.OK,
          data: data,
        }),
      );
  }
}
