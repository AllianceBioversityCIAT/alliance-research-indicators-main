import { Injectable } from '@nestjs/common';
import { BrokerConnectionBase } from './base/broker-base.connection';
import { LoggerUtil } from '../../shared/utils/logger.util';
import { ConfigMessageSocketDto, EmailBody } from './dto/mailer.dto';
import { AppConfig } from '../../shared/utils/app-config.util';

@Injectable()
export class MessageMicroservice extends BrokerConnectionBase {
  private _logger: LoggerUtil = new LoggerUtil({
    name: MessageMicroservice.name,
  });

  constructor(private readonly _appConfig: AppConfig) {
    super(_appConfig.ARI_MESSAGE_QUEUE);
  }

  get auth() {
    return {
      password: this._appConfig.ARI_MS_MESSAGE_SECRET,
      username: this._appConfig.ARI_MS_MESSAGE_CLIENT_ID,
    };
  }

  async sendEmail(message: EmailBody) {
    const parsedMessage: ConfigMessageSocketDto = {
      auth: this.auth,
      data: {
        environment: this._appConfig.ARI_MIS_ENV,
        from: {
          email: this._appConfig.ARI_FROM_EMAIL,
          name: this._appConfig.ARI_FROM_EMAIL_NAME,
        },
        emailBody: {
          subject: message?.subject,
          to: message?.to,
          cc: message?.cc,
          bcc: message?.bcc,
          message: {
            text: message?.message?.text,
            socketFile: message?.message?.socketFile,
          },
        },
      },
    };
    this.client.emit('send', parsedMessage);
    this._logger._log(`Email "${message.subject}" in process to send`);
  }
}
