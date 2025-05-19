import { Injectable } from '@nestjs/common';
import { AppConfig } from '../../shared/utils/app-config.util';
import { MessageMicroservice } from '../../tools/broker/message.microservice';
import { AskForHelp, AskForHelpTypeEnum } from './dto/reporting-feedback.dto';
import { TemplateService } from '../../shared/auxiliar/template/template.service';
import { TemplateEnum } from '../../shared/auxiliar/template/enum/template.enum';

@Injectable()
export class ReportingFeedbackService {
  constructor(
    private readonly _appConfig: AppConfig,
    private readonly _messageMicroservice: MessageMicroservice,
    private readonly _templateService: TemplateService,
  ) {}

  async handleFeedback(feedbackData: AskForHelp): Promise<void> {
    let templateName: TemplateEnum;
    let subject: string;
    let emailTo: string;
    const isProd = this._appConfig.ARI_IS_PRODUCTION ? '' : ' Simulation';
    if (feedbackData.type == AskForHelpTypeEnum.TECHNICAL_SUPPORT) {
      templateName = TemplateEnum.ASK_HELP_TECHNICAL;
      subject = `[${this._appConfig.ARI_MIS}] Technical Support Request${isProd}`;
      emailTo = this._appConfig.TECHNICAL_SUPPORT;
    } else if (feedbackData.type == AskForHelpTypeEnum.CONTENT_SUPPORT) {
      templateName = TemplateEnum.ASK_HELP_CONTENT;
      subject = `[${this._appConfig.ARI_MIS}] Content Support Request${isProd}`;
      emailTo = this._appConfig.CONTENT_SUPPORT;
    }

    const dataTemplate = {
      firstName: feedbackData.userData?.first_name,
      lastName: feedbackData.userData?.last_name,
      date: new Date(),
      description: feedbackData?.message,
      url: this._appConfig.COMPLETE_CLIENT_HOST(feedbackData?.url),
    };

    await this._templateService
      ._getTemplate(templateName, dataTemplate)
      .then((data) => {
        this._messageMicroservice.sendEmail({
          subject: subject,
          to: emailTo,
          cc: feedbackData.userData.email,
          message: {
            socketFile: Buffer.from(data),
          },
        });
      });
  }
}
