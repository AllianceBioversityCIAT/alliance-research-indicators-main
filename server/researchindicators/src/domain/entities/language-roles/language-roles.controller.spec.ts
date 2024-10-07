import { Test, TestingModule } from '@nestjs/testing';
import { LanguageRolesController } from './language-roles.controller';
import { LanguageRolesService } from './language-roles.service';

describe('LanguageRolesController', () => {
  let controller: LanguageRolesController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [LanguageRolesController],
      providers: [LanguageRolesService],
    }).compile();

    controller = module.get<LanguageRolesController>(LanguageRolesController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
