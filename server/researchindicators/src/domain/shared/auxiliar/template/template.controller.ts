import { Controller } from '@nestjs/common';
import { TemplateService } from './template.service';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('Template')
@Controller()
export class TemplateController {
  constructor(private readonly templateService: TemplateService) {}
}
