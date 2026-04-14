import { Test, TestingModule } from '@nestjs/testing';
import { ResultActorsController } from './result-actors.controller';
import { ResultActorsService } from './result-actors.service';
import { SetUpInterceptor } from '../../shared/Interceptors/setup.interceptor';
import { ResultsUtil } from '../../shared/utils/results.util';

describe('ResultActorsController', () => {
  let controller: ResultActorsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ResultActorsController],
      providers: [
        { provide: ResultActorsService, useValue: {} },
        SetUpInterceptor,
        {
          provide: ResultsUtil,
          useValue: { setup: jest.fn().mockResolvedValue(undefined) },
        },
      ],
    }).compile();
    controller = module.get(ResultActorsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
