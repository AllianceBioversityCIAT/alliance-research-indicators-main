import { In, Not } from 'typeorm';
import { HttpService } from '@nestjs/axios';
import { OpenSearchResultApi } from './result.opensearch.api';
import { ResultRepository } from '../../../entities/results/repositories/result.repository';
import { AppConfig } from '../../../shared/utils/app-config.util';
import { ResultStatusEnum } from '../../../entities/result-status/enum/result-status.enum';

describe('OpenSearchResultApi.filterLiveResults (H13)', () => {
  const repo = {
    find: jest.fn(),
    metadata: {
      primaryColumns: [{ propertyName: 'result_id' }],
      tableName: 'results',
    },
  };
  const api = new OpenSearchResultApi(
    {} as HttpService,
    repo as unknown as ResultRepository,
    {
      OPEN_SEARCH_URL: 'http://os',
      OPEN_SEARCH_USER: 'u',
      OPEN_SEARCH_PASS: 'p',
    } as AppConfig,
  );

  beforeEach(() => jest.clearAllMocks());

  it('drops hits that are deleted or no longer exist, keeping the search order', async () => {
    repo.find.mockResolvedValue([{ result_id: 3 }, { result_id: 1 }]);
    const hits = [
      { result_id: 1, title: 'a' },
      { result_id: 19944, title: 'Cloud Destiny' },
      { result_id: 3, title: 'c' },
    ];

    const result = await api.filterLiveResults(hits);

    expect(result).toEqual([hits[0], hits[2]]);
    expect(repo.find).toHaveBeenCalledWith({
      select: { result_id: true },
      where: {
        result_id: In([1, 19944, 3]),
        is_active: true,
        result_status_id: Not(ResultStatusEnum.DELETED),
      },
    });
  });

  it('does not query the database when there are no hits', async () => {
    await expect(api.filterLiveResults([])).resolves.toEqual([]);
    expect(repo.find).not.toHaveBeenCalled();
  });
});
