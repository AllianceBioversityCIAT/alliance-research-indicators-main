import { Controller } from '@nestjs/common';
import { ResultKeywordsService } from './result-keywords.service';

@Controller('result-keywords')
export class ResultKeywordsController {
  constructor(private readonly resultKeywordsService: ResultKeywordsService) {}
}
