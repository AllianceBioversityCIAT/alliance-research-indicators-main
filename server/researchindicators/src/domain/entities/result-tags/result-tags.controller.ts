import { Controller } from '@nestjs/common';
import { ResultTagsService } from './result-tags.service';

@Controller('result-tags')
export class ResultTagsController {
  constructor(private readonly resultTagsService: ResultTagsService) {}
}
