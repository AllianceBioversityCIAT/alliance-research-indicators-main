import { Test, TestingModule } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import { ResultImpactOutcomesService } from './result-impact-outcomes.service';
import { CurrentUserUtil } from '../../shared/utils/current-user.util';

describe('ResultImpactOutcomesService', () => {
  let service: ResultImpactOutcomesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ResultImpactOutcomesService,
        {
          provide: DataSource,
          useValue: {
            getRepository: jest.fn().mockReturnValue({
              find: jest.fn(),
              save: jest.fn(),
              metadata: { primaryColumns: [{ propertyName: 'result_id' }] },
            }),
          },
        },
        { provide: CurrentUserUtil, useValue: { audit: jest.fn() } },
      ],
    }).compile();

    service = module.get<ResultImpactOutcomesService>(
      ResultImpactOutcomesService,
    );
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
