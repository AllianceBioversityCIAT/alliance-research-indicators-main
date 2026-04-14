import { Test, TestingModule } from '@nestjs/testing';
import { ResultInstitutionTypesController } from './result-institution-types.controller';
import { ResultInstitutionTypesService } from './result-institution-types.service';

describe('ResultInstitutionTypesController', () => {
  let controller: ResultInstitutionTypesController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ResultInstitutionTypesController],
      providers: [{ provide: ResultInstitutionTypesService, useValue: {} }],
    }).compile();
    controller = module.get(ResultInstitutionTypesController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
