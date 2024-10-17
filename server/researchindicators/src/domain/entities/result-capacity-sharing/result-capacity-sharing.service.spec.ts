import { Test, TestingModule } from '@nestjs/testing';
import { ResultCapacitySharingService } from './result-capacity-sharing.service';
import { ResultCapacitySharingModule } from './result-capacity-sharing.module';
import { OrmConfigTestModule } from '../../../db/config/mysql/orm-connection-test.module';

describe('ResultCapacitySharingService', () => {
  let service: ResultCapacitySharingService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [ResultCapacitySharingModule, OrmConfigTestModule],
    }).compile();

    service = module.get<ResultCapacitySharingService>(
      ResultCapacitySharingService,
    );
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
