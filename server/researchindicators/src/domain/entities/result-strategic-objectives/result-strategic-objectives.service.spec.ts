import { Test, TestingModule } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import { ResultStrategicObjectivesService } from './result-strategic-objectives.service';
import { CurrentUserUtil } from '../../shared/utils/current-user.util';

describe('ResultStrategicObjectivesService', () => {
  let service: ResultStrategicObjectivesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ResultStrategicObjectivesService,
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

    service = module.get<ResultStrategicObjectivesService>(
      ResultStrategicObjectivesService,
    );
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
