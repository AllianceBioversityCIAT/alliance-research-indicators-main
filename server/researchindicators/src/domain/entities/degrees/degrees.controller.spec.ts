import { Test, TestingModule } from '@nestjs/testing';
import { DegreesController } from './degrees.controller';
import { DegreesService } from './degrees.service';

describe('DegreesController', () => {
  let controller: DegreesController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [DegreesController],
      providers: [DegreesService],
    }).compile();

    controller = module.get<DegreesController>(DegreesController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
