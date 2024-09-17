import { Test, TestingModule } from '@nestjs/testing';
import { DegreesService } from './degrees.service';

describe('DegreesService', () => {
  let service: DegreesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [DegreesService],
    }).compile();

    service = module.get<DegreesService>(DegreesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
