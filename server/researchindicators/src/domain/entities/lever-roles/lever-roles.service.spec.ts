import { Test, TestingModule } from '@nestjs/testing';
import { LeverRolesService } from './lever-roles.service';

describe('LeverRolesService', () => {
  let service: LeverRolesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [LeverRolesService],
    }).compile();

    service = module.get<LeverRolesService>(LeverRolesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
