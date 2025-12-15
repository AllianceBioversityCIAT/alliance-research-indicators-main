import { Controller } from '@nestjs/common';
import { ResultKnowledgeProductService } from './result-knowledge-product.service';

@Controller('result-knowledge-product')
export class ResultKnowledgeProductController {
  constructor(
    private readonly resultKnowledgeProductService: ResultKnowledgeProductService,
  ) {}
}
