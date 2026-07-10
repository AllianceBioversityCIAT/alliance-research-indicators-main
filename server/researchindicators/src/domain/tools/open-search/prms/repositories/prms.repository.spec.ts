import { Test, TestingModule } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import { PrmsRepository } from './prms.repository';

describe('PrmsRepository', () => {
  let repository: PrmsRepository;
  let dataSource: { query: jest.Mock };

  beforeEach(async () => {
    dataSource = {
      query: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PrmsRepository,
        { provide: DataSource, useValue: dataSource },
      ],
    }).compile();

    repository = module.get(PrmsRepository);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findTemporalResults', () => {
    it('should run the version-detection query filtered by execution code and return rows', async () => {
      const executionCode = 'exec-abc-123';
      const rows = [
        { code: 9001, year: 2023, is_version: true, data: {} },
        { code: 9001, year: 2024, is_version: false, data: {} },
      ];
      dataSource.query.mockResolvedValue(rows);

      const result = await repository.findTemporalResults(executionCode);

      expect(dataSource.query).toHaveBeenCalledTimes(1);
      expect(dataSource.query.mock.calls[0][0]).toContain(
        'FROM sync_staging_records',
      );
      expect(dataSource.query.mock.calls[0][0]).toContain('is_version');
      expect(dataSource.query.mock.calls[0][0]).toContain('execution_code');
      expect(dataSource.query.mock.calls[0][1]).toEqual([executionCode, executionCode]);
      expect(result).toEqual(rows);
    });
  });

  describe('deleteTemporalResults', () => {
    it('should delete staging records for the given execution code', async () => {
      dataSource.query.mockResolvedValue(undefined);
      const executionCode = 'abc-123';

      await repository.deleteTemporalResults(executionCode);

      expect(dataSource.query).toHaveBeenCalledWith(
        'DELETE FROM sync_staging_records WHERE execution_code = ?;',
        [executionCode],
      );
    });
  });
});
