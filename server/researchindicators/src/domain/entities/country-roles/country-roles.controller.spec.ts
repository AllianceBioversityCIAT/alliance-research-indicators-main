import { Test, TestingModule } from '@nestjs/testing';
import { CountryRolesController } from './country-roles.controller';
import { CountryRolesService } from './country-roles.service';

describe('CountryRolesController', () => {
  let controller: CountryRolesController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CountryRolesController],
      providers: [CountryRolesService],
    }).compile();

    controller = module.get<CountryRolesController>(CountryRolesController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
