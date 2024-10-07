import { Test, TestingModule } from '@nestjs/testing';
import { InstitutionRolesService } from './institution-roles.service';

describe('InstitutionRolesService', () => {
  let service: InstitutionRolesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [InstitutionRolesService],
    }).compile();

    service = module.get<InstitutionRolesService>(InstitutionRolesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
