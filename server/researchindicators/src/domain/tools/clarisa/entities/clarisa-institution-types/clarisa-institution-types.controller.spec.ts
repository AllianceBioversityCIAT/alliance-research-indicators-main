import { Test, TestingModule } from '@nestjs/testing';
import { ClarisaInstitutionTypesController } from './clarisa-institution-types.controller';
import { ClarisaInstitutionTypesService } from './clarisa-institution-types.service';

describe('ClarisaInstitutionTypesController', () => {
  let controller: ClarisaInstitutionTypesController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ClarisaInstitutionTypesController],
      providers: [ClarisaInstitutionTypesService],
    }).compile();

    controller = module.get<ClarisaInstitutionTypesController>(ClarisaInstitutionTypesController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
