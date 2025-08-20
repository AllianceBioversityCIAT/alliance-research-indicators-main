import {
  Body,
  Controller,
  HttpStatus,
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
  async createResult(@Body() syncProjectIndicatorsResultDto: SyncProjectIndicatorsResultDto) {
    return await this.indicatorsResultsService
      .syncResultToIndicator(syncProjectIndicatorsResultDto)
      .then((data) =>
        ResponseUtils.format({
          description: 'Structure created',
          status: HttpStatus.CREATED,
          data: data,
        }),
      );
  }
}
