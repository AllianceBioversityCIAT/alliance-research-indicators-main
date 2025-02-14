import { Controller, Get, HttpStatus } from '@nestjs/common';
import { ReportYearService } from './report-year.service';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ResponseUtils } from '../../shared/utils/response.utils';

@ApiTags('Results')
@ApiBearerAuth()
@Controller()
export class ReportYearController {
  constructor(private readonly reportYearService: ReportYearService) {}

  @Get()
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
