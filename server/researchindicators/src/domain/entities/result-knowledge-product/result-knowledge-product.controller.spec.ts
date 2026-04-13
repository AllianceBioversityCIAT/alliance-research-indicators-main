import { Test, TestingModule } from '@nestjs/testing';
import { ResultKnowledgeProductController } from './result-knowledge-product.controller';
import { ResultKnowledgeProductService } from './result-knowledge-product.service';

describe('ResultKnowledgeProductController', () => {
  let controller: ResultKnowledgeProductController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ResultKnowledgeProductController],
      providers: [
        { provide: ResultKnowledgeProductService, useValue: {} },
      ],
    }).compile();
    controller = module.get(ResultKnowledgeProductController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
