import { Injectable } from '@nestjs/common';
import { TemplateEnum } from '../../shared/auxiliar/template/enum/template.enum';
import { DataSource, EntityManager } from 'typeorm';
import { Template } from '../../shared/auxiliar/template/entities/template.entity';
import { GeneralDataDto } from './config/config-workflow';

@Injectable()
export class StatusWorkflowFunctionHandlerService {
  constructor(private readonly dataSource: DataSource) {}

  async getTemplate(
    template: TemplateEnum,
    manager: EntityManager,
  ): Promise<string> {
    return manager
      .getRepository(Template)
      .findOne({
        where: {
          name: template,
          is_active: true,
        },
      })
      .then(({ template }) => template);
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async sendEmail(generalData: GeneralDataDto, manager: EntityManager) {
    console.log('Email to send', generalData.customData.result_id);
  }
}
