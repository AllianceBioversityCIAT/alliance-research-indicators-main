import { Test, TestingModule } from '@nestjs/testing';
import { CountryRolesService } from './country-roles.service';

describe('CountryRolesService', () => {
  let service: CountryRolesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CountryRolesService],
    }).compile();

    service = module.get<CountryRolesService>(CountryRolesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
