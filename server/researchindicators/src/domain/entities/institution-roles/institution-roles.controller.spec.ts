import { Test, TestingModule } from '@nestjs/testing';
import { InstitutionRolesController } from './institution-roles.controller';
import { InstitutionRolesService } from './institution-roles.service';

describe('InstitutionRolesController', () => {
  let controller: InstitutionRolesController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [InstitutionRolesController],
      providers: [{ provide: InstitutionRolesService, useValue: {} }],
    }).compile();
    controller = module.get(InstitutionRolesController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
