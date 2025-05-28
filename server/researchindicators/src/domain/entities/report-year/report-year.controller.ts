import { Controller, Get, HttpStatus, UseInterceptors } from '@nestjs/common';
import { ReportYearService } from './report-year.service';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ResponseUtils } from '../../shared/utils/response.utils';
import { SetUpInterceptor } from '../../shared/Interceptors/setup.interceptor';
import {
  GetResultVersion,
  ParamOrQueryEnum,
} from '../../shared/decorators/versioning.decorator';

@ApiTags('Results')
@ApiBearerAuth()
@UseInterceptors(SetUpInterceptor)
@Controller()
export class ReportYearController {
  constructor(private readonly reportYearService: ReportYearService) {}

  @Get()
  @GetResultVersion(ParamOrQueryEnum.QUERY)
  async getReportYear() {
    return this.reportYearService.getReportYear().then((result) =>
      ResponseUtils.format({
        data: result,
        description: 'Report year list',
        status: HttpStatus.OK,
      }),
    );
  }
}
