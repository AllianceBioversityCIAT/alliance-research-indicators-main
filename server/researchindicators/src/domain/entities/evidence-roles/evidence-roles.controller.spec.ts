import { Test, TestingModule } from '@nestjs/testing';
import { EvidenceRolesController } from './evidence-roles.controller';
import { EvidenceRolesService } from './evidence-roles.service';

describe('EvidenceRolesController', () => {
  let controller: EvidenceRolesController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [EvidenceRolesController],
      providers: [{ provide: EvidenceRolesService, useValue: {} }],
    }).compile();
    controller = module.get(EvidenceRolesController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
