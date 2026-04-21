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

  it('findActiveSheets delegates to DataSource.query', async () => {
    query.mockResolvedValueOnce([{ sheet_key: 'a' }]);
    const rows = await repo.findActiveSheets('wb1');
    expect(rows).toEqual([{ sheet_key: 'a' }]);
    expect(query).toHaveBeenCalledWith(
      expect.stringContaining('report_workbook_sheet'),
      ['wb1'],
    );
  });

  it('findDataDictionaryRows delegates to DataSource.query', async () => {
    query.mockResolvedValueOnce([]);
    await repo.findDataDictionaryRows('wb1');
    expect(query).toHaveBeenCalledWith(
      expect.stringContaining('report_data_dictionary'),
      ['wb1'],
    );
  });

  it('findColumnGroups delegates to DataSource.query', async () => {
    query.mockResolvedValueOnce([]);
    await repo.findColumnGroups('wb1', 'raw_data');
    expect(query).toHaveBeenCalledWith(
      expect.stringContaining('report_workbook_column_group'),
      ['wb1', 'raw_data'],
    );
  });
});
