import { Test, TestingModule } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import { ReportLayoutRepository } from './report-layout.repository';

describe('ReportLayoutRepository', () => {
  let repo: ReportLayoutRepository;
  const query = jest.fn();

  beforeEach(async () => {
    query.mockReset();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReportLayoutRepository,
        { provide: DataSource, useValue: { query } },
      ],
    }).compile();
    repo = module.get(ReportLayoutRepository);
  });

  it('findDataDictionaryRows delegates to DataSource.query', async () => {
    query.mockResolvedValueOnce([]);
    await repo.findDataDictionaryRows('wb1');
    expect(query).toHaveBeenCalledWith(
      expect.stringContaining('report_data_dictionary'),
      ['wb1'],
    );
  });
});
