import { Test, TestingModule } from '@nestjs/testing';
import { HttpStatus } from '@nestjs/common';
import { AllianceStaffOpenSearchController } from './alliance-staff.opensearch.controller';
import { OpenSearchAllianceStaffApi } from './alliance-staff.opensearch.api';
import { ResponseUtils } from '../../../shared/utils/response.utils';
import { RolesGuard } from '../../../shared/guards/roles.guard';

jest.mock('../../../shared/utils/response.utils');

describe('AllianceStaffOpenSearchController', () => {
  let controller: AllianceStaffOpenSearchController;
  const mockApi = {
    resetElasticData: jest.fn(),
    search: jest.fn(),
  };
  const mockFormat = jest.fn();

  beforeEach(async () => {
    jest.clearAllMocks();
    (ResponseUtils.format as jest.Mock) = mockFormat;
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AllianceStaffOpenSearchController],
      providers: [{ provide: OpenSearchAllianceStaffApi, useValue: mockApi }],
    })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .compile();
    controller = module.get(AllianceStaffOpenSearchController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('resetOpenSearch', async () => {
    const data = { ok: true };
    mockApi.resetElasticData.mockResolvedValue(data);
    mockFormat.mockReturnValue({});
    await controller.resetOpenSearch();
    expect(ResponseUtils.format).toHaveBeenCalledWith({
      description: 'Elastic data reset',
      status: HttpStatus.OK,
      data,
    });
  });

  it('search', async () => {
    const hits = { hits: [] };
    mockApi.search.mockResolvedValue(hits);
    mockFormat.mockReturnValue({});
    await controller.search('alice', 15);
    expect(mockApi.search).toHaveBeenCalledWith(
      'alice',
      {
        carnet: true,
        first_name: true,
        last_name: true,
        email: true,
      },
      [{ carnet: { order: 'asc' } }],
      15,
    );
  });
});
