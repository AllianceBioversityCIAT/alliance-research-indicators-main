import { Controller } from '@nestjs/common';
import { ReportYearService } from './report-year.service';

@Controller('report-year')
export class ReportYearController {
  constructor(private readonly reportYearService: ReportYearService) {}
}
