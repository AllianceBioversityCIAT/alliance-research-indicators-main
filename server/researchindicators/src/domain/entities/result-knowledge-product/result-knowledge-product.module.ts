import { Module } from '@nestjs/common';
import { ResultKnowledgeProductService } from './result-knowledge-product.service';
import { ResultKnowledgeProductController } from './result-knowledge-product.controller';

@Module({
  controllers: [ResultKnowledgeProductController],
  providers: [ResultKnowledgeProductService],
  exports: [ResultKnowledgeProductService],
})
export class ResultKnowledgeProductModule {}
