import { Test, TestingModule } from '@nestjs/testing';
import { AiReportsService } from './ai-reports.service';
import { AiMetadataRepository } from './repository/ia-metadata.repository';
import { CreateAiReportDto } from './dto/create-ai-report.dto';
import { ResultStatusEnum } from '../result-status/enum/result-status.enum';

describe('AiReportsService', () => {
  let service: AiReportsService;
  let mockAiMetadataRepository: {
    bulkUploadProcessesRepository: { save: jest.Mock };
    bulkUploadResultsRepository: { save: jest.Mock };
  };

  beforeEach(async () => {
    mockAiMetadataRepository = {
      bulkUploadProcessesRepository: {
        save: jest.fn(),
      },
      bulkUploadResultsRepository: {
        save: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AiReportsService,
        {
          provide: AiMetadataRepository,
          useValue: mockAiMetadataRepository,
        },
      ],
    }).compile();

    service = module.get<AiReportsService>(AiReportsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should persist bulk upload process and map results with process id', async () => {
      const savedProcess = {
        id: 99,
        file_name: 'bulk.xlsx',
        ai_interaction_id: 'ai-1',
      };
      mockAiMetadataRepository.bulkUploadProcessesRepository.save.mockResolvedValue(
        savedProcess,
      );
      mockAiMetadataRepository.bulkUploadResultsRepository.save.mockResolvedValue(
        [],
      );

      const dto: CreateAiReportDto = {
        bulkUploadProcesses: {
          file_name: 'bulk.xlsx',
          ai_interaction_id: 'ai-1',
          created_by: 123,
        },
        bulkUploadResults: [
          {
            missing_fields: ['field_a'],
            manual_intervention_occurred: true,
            suggested_status: ResultStatusEnum.SUBMITTED,
            final_status: ResultStatusEnum.APPROVED,
            result_id: 10,
            created_by: 123,
            title: 'Result A',
            indicator_id: 5,
            error_message: 'partial failure',
          },
        ],
      };

      const result = await service.create(dto);

      expect(
        mockAiMetadataRepository.bulkUploadProcessesRepository.save,
      ).toHaveBeenCalledWith(dto.bulkUploadProcesses);
      expect(
        mockAiMetadataRepository.bulkUploadResultsRepository.save,
      ).toHaveBeenCalledWith([
        expect.objectContaining({
          bulk_upload_process_id: 99,
          missing_fields: ['field_a'],
          manual_intervention_occurred: true,
          suggested_status: ResultStatusEnum.SUBMITTED,
          final_status: ResultStatusEnum.APPROVED,
          result_id: 10,
          created_by: 123,
          title: 'Result A',
          indicator_id: 5,
          error_message: 'partial failure',
        }),
      ]);
      expect(result).toEqual(savedProcess);
    });

    it('should persist multiple bulk upload results linked to the same process', async () => {
      mockAiMetadataRepository.bulkUploadProcessesRepository.save.mockResolvedValue(
        { id: 7 },
      );
      mockAiMetadataRepository.bulkUploadResultsRepository.save.mockResolvedValue(
        [],
      );

      await service.create({
        bulkUploadProcesses: {
          file_name: 'multi.csv',
          ai_interaction_id: 'ai-7',
        },
        bulkUploadResults: [
          { title: 'First', result_id: 1 },
          { title: 'Second', result_id: 2, error_message: 'failed' },
        ],
      });

      expect(
        mockAiMetadataRepository.bulkUploadResultsRepository.save,
      ).toHaveBeenCalledWith([
        expect.objectContaining({
          bulk_upload_process_id: 7,
          title: 'First',
          result_id: 1,
        }),
        expect.objectContaining({
          bulk_upload_process_id: 7,
          title: 'Second',
          result_id: 2,
          error_message: 'failed',
        }),
      ]);
    });

    it('should save an empty results array when no bulk upload results are provided', async () => {
      mockAiMetadataRepository.bulkUploadProcessesRepository.save.mockResolvedValue(
        { id: 1 },
      );
      mockAiMetadataRepository.bulkUploadResultsRepository.save.mockResolvedValue(
        [],
      );

      await service.create({
        bulkUploadProcesses: {
          file_name: 'empty.csv',
          ai_interaction_id: 'ai-empty',
        },
        bulkUploadResults: [],
      });

      expect(
        mockAiMetadataRepository.bulkUploadResultsRepository.save,
      ).toHaveBeenCalledWith([]);
    });
  });
});
