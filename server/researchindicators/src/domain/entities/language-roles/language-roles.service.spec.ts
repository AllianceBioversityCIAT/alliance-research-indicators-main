import { Test, TestingModule } from '@nestjs/testing';
import { LanguageRolesService } from './language-roles.service';

describe('LanguageRolesService', () => {
  let service: LanguageRolesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [LanguageRolesService],
    }).compile();

    service = module.get<LanguageRolesService>(LanguageRolesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
