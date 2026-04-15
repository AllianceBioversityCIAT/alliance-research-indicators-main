import { Test, TestingModule } from '@nestjs/testing';
import { ResultTagsController } from './result-tags.controller';
import { ResultTagsService } from './result-tags.service';

describe('ResultTagsController', () => {
  let controller: ResultTagsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ResultTagsController],
      providers: [{ provide: ResultTagsService, useValue: {} }],
    }).compile();
    controller = module.get(ResultTagsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
