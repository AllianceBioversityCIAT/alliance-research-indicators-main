import { Test, TestingModule } from '@nestjs/testing';
import { ResultNotableReferencesController } from './result-notable-references.controller';
import { ResultNotableReferencesService } from './result-notable-references.service';

describe('ResultNotableReferencesController', () => {
  let controller: ResultNotableReferencesController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ResultNotableReferencesController],
      providers: [{ provide: ResultNotableReferencesService, useValue: {} }],
    }).compile();
    controller = module.get(ResultNotableReferencesController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
