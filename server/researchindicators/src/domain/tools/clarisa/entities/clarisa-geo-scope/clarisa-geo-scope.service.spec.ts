import { Test, TestingModule } from '@nestjs/testing';
import { ClarisaGeoScopeService } from './clarisa-geo-scope.service';

describe('ClarisaGeoScopeService', () => {
  let service: ClarisaGeoScopeService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ClarisaGeoScopeService],
    }).compile();

    service = module.get<ClarisaGeoScopeService>(ClarisaGeoScopeService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
