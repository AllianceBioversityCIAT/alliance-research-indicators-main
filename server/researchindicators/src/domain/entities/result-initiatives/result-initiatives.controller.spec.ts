import { Test, TestingModule } from '@nestjs/testing';
import { ResultInitiativesController } from './result-initiatives.controller';
import { ResultInitiativesService } from './result-initiatives.service';

describe('ResultInitiativesController', () => {
  let controller: ResultInitiativesController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ResultInitiativesController],
      providers: [{ provide: ResultInitiativesService, useValue: {} }],
    }).compile();
    controller = module.get(ResultInitiativesController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
