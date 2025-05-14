import {
  Body,
  Controller,
  HttpStatus,
  Patch,
  UseInterceptors,
} from '@nestjs/common';
import { ReportingFeedbackService } from './reporting-feedback.service';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { SetUpInterceptor } from '../../shared/Interceptors/setup.interceptor';
import { AskForHelp } from './dto/reporting-feedback.dto';
import { ResponseUtils } from '../../shared/utils/response.utils';

@ApiTags('Feedback')
@ApiBearerAuth()
@UseInterceptors(SetUpInterceptor)
@Controller()
export class ReportingFeedbackController {
  constructor(
    private readonly reportingFeedbackService: ReportingFeedbackService,
  ) {}

  @Patch('send')
  async updateFeedback(@Body() feedbackData: AskForHelp) {
    return this.reportingFeedbackService.handleFeedback(feedbackData).then(() =>
      ResponseUtils.format({
        description: 'Feedback sent',
        status: HttpStatus.OK,
      }),
    );
  }
}
