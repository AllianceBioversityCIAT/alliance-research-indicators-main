import { Test, TestingModule } from '@nestjs/testing';
import { PrmsOpenSearchController } from './prms.opensearch.controller';
import { PrmsOpenSearchService } from './prms.opensearch.service';
import { RolesGuard } from '../../../shared/guards/roles.guard';

describe('PrmsOpenSearchController', () => {
  let controller: PrmsOpenSearchController;
  const mockPrmsService = {
    getData: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PrmsOpenSearchController],
      providers: [
        { provide: PrmsOpenSearchService, useValue: mockPrmsService },
      ],
    })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get(PrmsOpenSearchController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('fetchPrmsData should call getData with parsed year', async () => {
    mockPrmsService.getData.mockResolvedValue(undefined);
    await controller.fetchPrmsData('2024');
    expect(mockPrmsService.getData).toHaveBeenCalledWith(2024);
  });
});
