import { Test, TestingModule } from '@nestjs/testing';
import { EvidenceRolesService } from './evidence-roles.service';

describe('EvidenceRolesService', () => {
  let service: EvidenceRolesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [EvidenceRolesService],
    }).compile();

    service = module.get<EvidenceRolesService>(EvidenceRolesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
