import { Controller } from '@nestjs/common';
import { AiReportsService } from './ai-reports.service';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

@ApiTags('AI Reports')
@ApiBearerAuth()
@Controller('ai-reports')
export class AiReportsController {
  constructor(private readonly aiReportsService: AiReportsService) { }

}
