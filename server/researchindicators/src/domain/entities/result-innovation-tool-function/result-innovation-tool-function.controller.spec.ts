import { Test, TestingModule } from '@nestjs/testing';
import { ResultInnovationToolFunctionController } from './result-innovation-tool-function.controller';
import { ResultInnovationToolFunctionService } from './result-innovation-tool-function.service';

describe('ResultInnovationToolFunctionController', () => {
  let controller: ResultInnovationToolFunctionController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ResultInnovationToolFunctionController],
      providers: [
        { provide: ResultInnovationToolFunctionService, useValue: {} },
      ],
    }).compile();
    controller = module.get(ResultInnovationToolFunctionController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
