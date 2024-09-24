import { Test, TestingModule } from '@nestjs/testing';
import { ResultEvidencesController } from './result-evidences.controller';
import { ResultEvidencesService } from './result-evidences.service';

describe('ResultEvidencesController', () => {
  let controller: ResultEvidencesController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ResultEvidencesController],
      providers: [ResultEvidencesService],
    }).compile();

    controller = module.get<ResultEvidencesController>(
      ResultEvidencesController,
    );
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
