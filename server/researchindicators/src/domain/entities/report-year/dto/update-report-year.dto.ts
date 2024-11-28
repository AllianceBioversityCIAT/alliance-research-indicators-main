import { PartialType } from '@nestjs/swagger';
import { CreateReportYearDto } from './create-report-year.dto';

export class UpdateReportYearDto extends PartialType(CreateReportYearDto) {}
