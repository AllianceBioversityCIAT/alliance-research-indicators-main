import { DataSource } from 'typeorm';
import { TipIntegrationRepository } from './tip-integration.repository';
import { LoggerUtil } from '../../../shared/utils/logger.util';

describe('TipIntegrationRepository', () => {
  let repository: TipIntegrationRepository;
  let queryMock: jest.Mock;

  beforeEach(() => {
    queryMock = jest.fn();
    const dataSource = { query: queryMock } as unknown as DataSource;
    repository = new TipIntegrationRepository(dataSource);
    jest.spyOn(LoggerUtil.prototype, '_debug').mockImplementation();
    jest.spyOn(LoggerUtil.prototype, '_error').mockImplementation();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('allTipResultId returns split ids', async () => {
    queryMock.mockResolvedValueOnce([{ ids: '10,20,30' }]);
    await expect(repository.allTipResultId([1, 2])).resolves.toEqual([
      '10',
      '20',
      '30',
    ]);
    expect(queryMock.mock.calls[0][0] as string).toContain(
      'result_official_code not in (1,2)',
    );
    expect(queryMock.mock.calls[0][0] as string).not.toContain(
      'report_year_id',
    );
    expect(queryMock.mock.calls[0][1]).toEqual([]);
  });

  it('allTipResultId filters by report year when year is provided', async () => {
    queryMock.mockResolvedValueOnce([{ ids: '99' }]);
    await expect(repository.allTipResultId([1], 2026)).resolves.toEqual(['99']);
    expect(queryMock.mock.calls[0][0] as string).toContain(
      'r.report_year_id = ?',
    );
    expect(queryMock.mock.calls[0][1]).toEqual([2026]);
  });

  it('allTipResultId returns empty array when ids missing', async () => {
    queryMock.mockResolvedValueOnce([{}]);
    await expect(repository.allTipResultId([])).resolves.toEqual([]);
  });

  it('inactiveAllTipResults resolves on success', async () => {
    queryMock.mockResolvedValueOnce(undefined);
    await expect(repository.inactiveAllTipResults(5)).resolves.toBeUndefined();
    expect(queryMock).toHaveBeenCalledWith('SELECT delete_result(?)', [5]);
  });

  it('inactiveAllTipResults swallows rejection after logging', async () => {
    queryMock.mockRejectedValueOnce(new Error('db'));
    await expect(repository.inactiveAllTipResults(5)).resolves.toBeUndefined();
  });
});
