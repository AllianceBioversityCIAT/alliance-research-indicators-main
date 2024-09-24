import { Test, TestingModule } from '@nestjs/testing';
import { ClarisaInstitutionsController } from './clarisa-institutions.controller';
import { ClarisaInstitutionsService } from './clarisa-institutions.service';

describe('ClarisaInstitutionsController', () => {
  let controller: ClarisaInstitutionsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ClarisaInstitutionsController],
      providers: [ClarisaInstitutionsService],
    }).compile();

    controller = module.get<ClarisaInstitutionsController>(
      ClarisaInstitutionsController,
    );
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
