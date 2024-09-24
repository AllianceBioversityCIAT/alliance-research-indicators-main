import { Test, TestingModule } from '@nestjs/testing';
import { ClarisaGeoScopeController } from './clarisa-geo-scope.controller';
import { ClarisaGeoScopeService } from './clarisa-geo-scope.service';

describe('ClarisaGeoScopeController', () => {
  let controller: ClarisaGeoScopeController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ClarisaGeoScopeController],
      providers: [ClarisaGeoScopeService],
    }).compile();

    controller = module.get<ClarisaGeoScopeController>(
      ClarisaGeoScopeController,
    );
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
