import { Test, TestingModule } from '@nestjs/testing';
import { HttpStatus } from '@nestjs/common';
import { ResultOpenSearchController } from './result.opensearch.controller';
import { OpenSearchResultApi } from './result.opensearch.api';
import { ResponseUtils } from '../../../shared/utils/response.utils';

jest.mock('../../../shared/utils/response.utils');

describe('ResultOpenSearchController', () => {
  let controller: ResultOpenSearchController;
  const mockApi = {
    resetElasticData: jest.fn(),
    search: jest.fn(),
  };
  const mockFormat = jest.fn();

  beforeEach(async () => {
    jest.clearAllMocks();
    (ResponseUtils.format as jest.Mock) = mockFormat;
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ResultOpenSearchController],
      providers: [{ provide: OpenSearchResultApi, useValue: mockApi }],
    }).compile();
    controller = module.get(ResultOpenSearchController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('resetOpenSearch', async () => {
    const data = {};
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
    const hits = [];
    mockApi.search.mockResolvedValue(hits);
    mockFormat.mockReturnValue({});
    await controller.search('title', 10);
    expect(mockApi.search).toHaveBeenCalledWith(
      'title',
      {
        title: true,
        description: true,
        result_official_code: true,
        indicator: { name: true },
        keywords: true,
      },
      [{ title: { order: 'asc' } }],
      10,
    );
  });
});
