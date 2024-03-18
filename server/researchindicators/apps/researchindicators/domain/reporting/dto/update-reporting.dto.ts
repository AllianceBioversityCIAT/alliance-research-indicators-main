import { PartialType } from '@nestjs/mapped-types';
import { CreateReportingDto } from './create-reporting.dto';

export class UpdateReportingDto extends PartialType(CreateReportingDto) {}
