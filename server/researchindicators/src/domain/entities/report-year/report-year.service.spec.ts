import { Test, TestingModule } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import { ReportYearService } from './report-year.service';
import { ReportYear } from './entities/report-year.entity';
import { ReportYearRepository } from './repositories/report-year.repository';
import { CurrentUserUtil } from '../../shared/utils/current-user.util';
import { ResultsUtil } from '../../shared/utils/results.util';

describe('ReportYearService', () => {
  let service: ReportYearService;
  const findOne = jest.fn();
  const getAllReportYears = jest.fn();

  const mockReportYearRepo = {
    getAllReportYears,
    metadata: {
      primaryColumns: [{ propertyName: 'report_year' }],
    },
  };

  const mockDataSource = {
    getRepository: jest.fn().mockReturnValue({
      findOne,
    }),
  };

  const mockCurrentUser = { user_id: 1, audit: jest.fn() };

  const resultsUtilStub = { nullResultCode: 555 };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReportYearService,
        { provide: DataSource, useValue: mockDataSource },
        { provide: CurrentUserUtil, useValue: mockCurrentUser },
        {
          provide: ReportYearRepository,
          useValue: mockReportYearRepo,
        },
        {
          provide: ResultsUtil,
          useValue: resultsUtilStub as unknown as ResultsUtil,
        },
      ],
    }).compile();

    service = module.get<ReportYearService>(ReportYearService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('activeReportYear', () => {
    it('should return single active report year from repository', async () => {
      const row = { report_year: 2024 } as ReportYear;
      findOne.mockResolvedValue(row);

      const result = await service.activeReportYear();

      expect(mockDataSource.getRepository).toHaveBeenCalledWith(ReportYear);
      expect(findOne).toHaveBeenCalledWith({ where: { is_active: true } });
      expect(result).toBe(row);
    });
  });

  describe('getReportYear', () => {
    it('should request years in window around current year with result code', async () => {
      const rows = [{ report_year: 2025 } as ReportYear];
      getAllReportYears.mockResolvedValue(rows);
      const currentYear = new Date().getFullYear();

      const result = await service.getReportYear();

      expect(getAllReportYears).toHaveBeenCalledWith(
        {
          from: currentYear - 5,
          to: currentYear + 2,
        },
        555,
      );
      expect(result).toBe(rows);
    });
  });
});
