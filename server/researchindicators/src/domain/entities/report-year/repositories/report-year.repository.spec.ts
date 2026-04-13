import { DataSource } from 'typeorm';
import { ReportYearRepository } from './report-year.repository';

describe('ReportYearRepository', () => {
  let repository: ReportYearRepository;
  let querySpy: jest.SpyInstance;

  const dataSource = {
    createEntityManager: jest.fn().mockReturnValue({}),
  } as unknown as DataSource;

  beforeEach(() => {
    repository = new ReportYearRepository(dataSource);
    querySpy = jest.spyOn(repository, 'query').mockResolvedValue([] as any);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('getAllReportYears without resultCode uses two params', async () => {
    await repository.getAllReportYears({ from: 2020, to: 2025 });
    expect(querySpy).toHaveBeenCalledWith(expect.any(String), [2020, 2025]);
    expect(querySpy.mock.calls[0][0] as string).not.toContain(
      'has_reported',
    );
  });

  it('getAllReportYears with resultCode prepends param and adds join', async () => {
    await repository.getAllReportYears({ from: 2021, to: 2024 }, 1001);
    expect(querySpy).toHaveBeenCalledWith(expect.any(String), [
      1001,
      2021,
      2024,
    ]);
    expect(querySpy.mock.calls[0][0] as string).toContain('has_reported');
  });
});
