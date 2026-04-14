import { Test, TestingModule } from '@nestjs/testing';
import { ResultQuantificationsController } from './result-quantifications.controller';
import { ResultQuantificationsService } from './result-quantifications.service';

describe('ResultQuantificationsController', () => {
  let controller: ResultQuantificationsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ResultQuantificationsController],
      providers: [{ provide: ResultQuantificationsService, useValue: {} }],
    }).compile();
    controller = module.get(ResultQuantificationsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
