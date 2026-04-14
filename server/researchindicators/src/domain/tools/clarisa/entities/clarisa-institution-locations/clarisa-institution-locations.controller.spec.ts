import { Test, TestingModule } from '@nestjs/testing';
import { ClarisaInstitutionLocationsController } from './clarisa-institution-locations.controller';
import { ClarisaInstitutionLocationsService } from './clarisa-institution-locations.service';

describe('ClarisaInstitutionLocationsController', () => {
  let controller: ClarisaInstitutionLocationsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ClarisaInstitutionLocationsController],
      providers: [
        {
          provide: ClarisaInstitutionLocationsService,
          useValue: {},
        },
      ],
    }).compile();
    controller = module.get(ClarisaInstitutionLocationsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
