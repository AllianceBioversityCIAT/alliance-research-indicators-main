import { Test, TestingModule } from '@nestjs/testing';
import { ResultInstitutionsController } from './result-institutions.controller';
import { ResultInstitutionsService } from './result-institutions.service';

describe('ResultInstitutionsController', () => {
  let controller: ResultInstitutionsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ResultInstitutionsController],
      providers: [ResultInstitutionsService],
    }).compile();

    controller = module.get<ResultInstitutionsController>(ResultInstitutionsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
