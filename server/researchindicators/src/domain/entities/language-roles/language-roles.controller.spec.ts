import { Test, TestingModule } from '@nestjs/testing';
import { LanguageRolesController } from './language-roles.controller';
import { LanguageRolesService } from './language-roles.service';

describe('LanguageRolesController', () => {
  let controller: LanguageRolesController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [LanguageRolesController],
      providers: [{ provide: LanguageRolesService, useValue: {} }],
    }).compile();
    controller = module.get(LanguageRolesController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
