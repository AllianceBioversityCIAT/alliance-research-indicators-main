import { Test, TestingModule } from '@nestjs/testing';
import { LinkResultRolesController } from './link-result-roles.controller';
import { LinkResultRolesService } from './link-result-roles.service';

describe('LinkResultRolesController', () => {
  let controller: LinkResultRolesController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [LinkResultRolesController],
      providers: [{ provide: LinkResultRolesService, useValue: {} }],
    }).compile();
    controller = module.get(LinkResultRolesController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
