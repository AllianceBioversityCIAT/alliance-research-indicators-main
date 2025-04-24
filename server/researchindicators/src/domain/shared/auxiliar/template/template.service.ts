import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { Template } from './entities/template.entity';
import { TemplateEnum } from './enum/template.enum';
import Handlebars from 'handlebars';

@Injectable()
export class TemplateService {
  constructor(private readonly dataSource: DataSource) {}

  async _getTemplate<T>(name: TemplateEnum, data?: T): Promise<string> {
    let template: string = await this.dataSource
      .getRepository(Template)
      .findOne({
        where: {
          name: name,
          is_active: true,
        },
      })
      .then(({ template }) => template);

    if (template && data !== undefined)
      template = Handlebars.compile(template)(data);

    return template;
  }
}
