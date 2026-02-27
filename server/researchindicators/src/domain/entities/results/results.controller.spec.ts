import { Test, TestingModule } from '@nestjs/testing';
import { HttpStatus } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { ResultsController } from './results.controller';
import { ResultsService } from './results.service';
import { ResultsUtil } from '../../shared/utils/results.util';
import { ResponseUtils } from '../../shared/utils/response.utils';
import { TrueFalseEnum } from '../../shared/enum/queries.enum';
import { ResultStatusGuard } from '../../shared/guards/result-status.guard';
import { SetUpInterceptor } from '../../shared/Interceptors/setup.interceptor';

// Mock ResponseUtils
jest.mock('../../shared/utils/response.utils');

describe('ResultsController', () => {
  let controller: ResultsController;
  let service: jest.Mocked<ResultsService>;
  let resultsUtil: jest.Mocked<ResultsUtil>;

  const mockResult: any = {
    result_id: 1,
    result_official_code: 12345,
    title: 'Test Result',
    description: 'Test Description',
    indicator_id: 1,
    contract_id: 'TEST-001',
    is_active: true,
    created_date: new Date(),
    last_updated_date: new Date(),
    created_by: 1,
    last_updated_by: 1,
    report_year: { year: 2023 },
    result_status: { status: 'active' },
    indicator: { name: 'Test Indicator' },
    geo_scope: { scope: 'global' },
    result_contracts: [],
  };

  const mockResultsService = {
    findResults: jest.fn(),
    findResultVersions: jest.fn(),
    createResult: jest.fn(),
    deleteResult: jest.fn(),
    updateGeneralInfo: jest.fn(),
    findGeneralInfo: jest.fn(),
    updateResultAlignment: jest.fn(),
    findResultAlignment: jest.fn(),
    findMetadataResult: jest.fn(),
    formalizeResult: jest.fn(),
    saveGeoLocation: jest.fn(),
    findGeoLocation: jest.fn(),
    findLastUpdatedResultByCurrentUser: jest.fn(),
  };

  const mockResultsUtil = {
    resultCode: 12345,
    resultId: 1,
    result: mockResult,
    setup: jest.fn(),
  };

  const mockResponseUtils = {
    format: jest.fn(),
  };

  const mockDataSource = {
    getRepository: jest.fn().mockReturnValue({
      findOne: jest.fn(),
      find: jest.fn(),
      save: jest.fn(),
      delete: jest.fn(),
      update: jest.fn(),
    }),
    createQueryBuilder: jest.fn(),
    manager: {
      transaction: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ResultsController],
      providers: [
        {
          provide: ResultsService,
          useValue: mockResultsService,
        },
        {
          provide: ResultsUtil,
          useValue: mockResultsUtil,
        },
        {
          provide: DataSource,
          useValue: mockDataSource,
        },
        ResultStatusGuard,
        SetUpInterceptor,
      ],
    }).compile();

    controller = module.get<ResultsController>(ResultsController);
    service = module.get(ResultsService);
    resultsUtil = module.get(ResultsUtil);

    // Setup ResponseUtils mock
    (ResponseUtils.format as jest.Mock) = mockResponseUtils.format;

    // Reset all mocks before each test
    jest.clearAllMocks();
  });

  describe('Constructor', () => {
    it('should be defined', () => {
      expect(controller).toBeDefined();
    });

    it('should inject ResultsService and ResultsUtil correctly', () => {
      expect(controller['resultsService']).toBe(service);
      expect(controller['_resultsUtil']).toBe(resultsUtil);
    });
  });

  describe('find', () => {
    it('should find all results with default parameters', async () => {
      const mockResults = [mockResult];
      const expectedResponse = {
        description: 'Results found',
        status: HttpStatus.OK,
        data: mockResults,
      };

      service.findResults.mockResolvedValue(mockResults);
      mockResponseUtils.format.mockReturnValue(expectedResponse);

      const result = await controller.find(
        '1',
        '10',
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        'asc',
        [],
        [],
        [],
        [],
        [],
        [],
        [],
        [],
        [],
      );

      expect(service.findResults).toHaveBeenCalledWith({
        contracts: false,
        levers: false,
        indicators: false,
        result_status: false,
        result_audit_data: false,
        primary_contract: false,
        primary_lever: false,
        result_audit_data_objects: false,
        indicator_code: [],
        page: 1,
        limit: 10,
        sort_order: 'asc',
        contract_codes: [],
        lever_codes: [],
        status_codes: [],
        user_codes: [],
        years: [],
        resultCodes: [],
        platform_code: [],
        filter_primary_contract: [],
      });
      expect(result).toEqual(expectedResponse);
    });

    it('should find results with all filters enabled', async () => {
      const mockResults = [mockResult];
      service.findResults.mockResolvedValue(mockResults);
      mockResponseUtils.format.mockReturnValue({});

      await controller.find(
        '2',
        '20',
        true,
        true,
        true,
        true,
        true,
        true,
        true,
        true,
        'desc',
        ['IND1'],
        ['CONT1'],
        ['LEV1'],
        ['STAT1'],
        ['USER1'],
        ['2023'],
        ['RES1'],
        [],
        [],
      );

      expect(service.findResults).toHaveBeenCalledWith({
        contracts: true,
        levers: true,
        indicators: true,
        result_status: true,
        result_audit_data: true,
        primary_contract: true,
        primary_lever: true,
        result_audit_data_objects: true,
        indicator_code: ['IND1'],
        page: 2,
        limit: 20,
        sort_order: 'desc',
        contract_codes: ['CONT1'],
        lever_codes: ['LEV1'],
        status_codes: ['STAT1'],
        user_codes: ['USER1'],
        years: ['2023'],
        resultCodes: ['RES1'],
        platform_code: [],
        filter_primary_contract: [],
      });
    });

    it('should handle service errors', async () => {
      const error = new Error('Database error');
      service.findResults.mockRejectedValue(error);

      await expect(
        controller.find(
          '1',
          '10',
          false,
          false,
          false,
          false,
          false,
          false,
          false,
          false,
          'asc',
          [],
          [],
          [],
          [],
          [],
          [],
          [],
          [],
          [],
        ),
      ).rejects.toThrow('Database error');
    });

    it('should handle empty results', async () => {
      service.findResults.mockResolvedValue([]);
      mockResponseUtils.format.mockReturnValue({
        description: 'Results found',
        status: HttpStatus.OK,
        data: [],
      });

      const result = await controller.find(
        '1',
        '10',
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        'asc',
        [],
        [],
        [],
        [],
        [],
        [],
        [],
        [],
        [],
      );

      expect(result.data).toEqual([]);
    });
  });

  describe('findAllVersions', () => {
    it('should find all result versions', async () => {
      const mockVersions = { live: [mockResult], versions: [mockResult] };
      const expectedResponse = {
        description: 'Results versions found',
        status: HttpStatus.OK,
        data: mockVersions,
      };

      service.findResultVersions.mockResolvedValue(mockVersions);
      mockResponseUtils.format.mockReturnValue(expectedResponse);

      const result = await controller.findAllVersions();

      expect(service.findResultVersions).toHaveBeenCalledWith(
        resultsUtil.resultCode,
        resultsUtil.platformCode,
      );
      expect(result).toEqual(expectedResponse);
    });

    it('should handle errors when finding versions', async () => {
      const error = new Error('Version not found');
      service.findResultVersions.mockRejectedValue(error);

      await expect(controller.findAllVersions()).rejects.toThrow(
        'Version not found',
      );
    });
  });

  describe('createResult', () => {
    it('should create a new result', async () => {
      const createResultDto: any = {
        title: 'New Result',
        description: 'New Description',
        indicator_id: 1,
        contract_id: 'NEW-001',
        year: 2023,
      };
      const expectedResponse = {
        description: 'Result created',
        status: HttpStatus.CREATED,
        data: mockResult,
      };

      service.createResult.mockResolvedValue(mockResult);
      mockResponseUtils.format.mockReturnValue(expectedResponse);

      const result = await controller.createResult(createResultDto);

      expect(service.createResult).toHaveBeenCalledWith(createResultDto);
      expect(result).toEqual(expectedResponse);
    });

    it('should handle validation errors when creating result', async () => {
      const createResultDto: any = { contract_id: 'INVALID', year: 2023 };
      const error = new Error('Validation failed');
      service.createResult.mockRejectedValue(error);

      await expect(controller.createResult(createResultDto)).rejects.toThrow(
        'Validation failed',
      );
    });
  });

  describe('deleteResult', () => {
    it('should delete a result', async () => {
      const expectedResponse = {
        description: 'Result deleted',
        status: HttpStatus.OK,
      };

      service.deleteResult.mockResolvedValue(undefined);
      mockResponseUtils.format.mockReturnValue(expectedResponse);

      const result = await controller.deleteResult();

      expect(service.deleteResult).toHaveBeenCalledWith(resultsUtil.resultId);
      expect(result).toEqual(expectedResponse);
    });

    it('should handle errors when deleting result', async () => {
      const error = new Error('Result not found');
      service.deleteResult.mockRejectedValue(error);

      await expect(controller.deleteResult()).rejects.toThrow(
        'Result not found',
      );
    });
  });

  describe('updateGeneralInformation', () => {
    it('should update general information', async () => {
      const updateDto: any = {
        title: 'Updated Title',
        description: 'Updated Description',
        year: 2023,
      };
      const expectedResponse = {
        description: 'General information was updated correctly',
        data: mockResult,
        status: HttpStatus.OK,
      };

      service.updateGeneralInfo.mockResolvedValue(mockResult);
      mockResponseUtils.format.mockReturnValue(expectedResponse);

      const result = await controller.updateGeneralInformation(
        TrueFalseEnum.TRUE,
        updateDto,
      );

      expect(service.updateGeneralInfo).toHaveBeenCalledWith(
        resultsUtil.resultId,
        updateDto,
        TrueFalseEnum.TRUE,
      );
      expect(result).toEqual(expectedResponse);
    });

    it('should handle update errors', async () => {
      const updateDto: any = { title: 'Invalid', year: 2023 };
      const error = new Error('Update failed');
      service.updateGeneralInfo.mockRejectedValue(error);

      await expect(
        controller.updateGeneralInformation(TrueFalseEnum.FALSE, updateDto),
      ).rejects.toThrow('Update failed');
    });
  });

  describe('findGeneralInformation', () => {
    it('should find general information', async () => {
      const expectedResponse = {
        description: 'General information was found correctly',
        data: mockResult,
        status: HttpStatus.OK,
      };

      service.findGeneralInfo.mockResolvedValue(mockResult);
      mockResponseUtils.format.mockReturnValue(expectedResponse);

      const result = await controller.findGeneralInformation();

      expect(service.findGeneralInfo).toHaveBeenCalledWith(
        resultsUtil.resultId,
      );
      expect(result).toEqual(expectedResponse);
    });
  });

  describe('updateResultAlignments', () => {
    it('should update result alignments', async () => {
      const alignmentDto: any = {
        contracts: [],
        levers: [],
        result_sdgs: [],
      };
      const expectedResponse = {
        description: 'Alignments was updated correctly',
        data: mockResult,
        status: HttpStatus.OK,
      };

      service.updateResultAlignment.mockResolvedValue(mockResult);
      mockResponseUtils.format.mockReturnValue(expectedResponse);

      const result = await controller.updateResultAlignments(
        TrueFalseEnum.TRUE,
        alignmentDto,
      );

      expect(service.updateResultAlignment).toHaveBeenCalledWith(
        resultsUtil.resultId,
        alignmentDto,
        TrueFalseEnum.TRUE,
      );
      expect(result).toEqual(expectedResponse);
    });
  });

  describe('findResultAlignments', () => {
    it('should find result alignments', async () => {
      const mockAlignment = { contracts: [], levers: [], result_sdgs: [] };
      const expectedResponse = {
        description: 'alignments was found correctly',
        data: mockAlignment,
        status: HttpStatus.OK,
      };

      service.findResultAlignment.mockResolvedValue(mockAlignment as any);
      mockResponseUtils.format.mockReturnValue(expectedResponse);

      const result = await controller.findResultAlignments();

      expect(service.findResultAlignment).toHaveBeenCalledWith(
        resultsUtil.resultId,
      );
      expect(result).toEqual(expectedResponse);
    });
  });

  describe('findMetadata', () => {
    it('should find metadata', async () => {
      const mockMetadata: any = { version: 1, created_at: new Date() };
      const expectedResponse = {
        description: 'Metadata was found correctly',
        data: mockMetadata,
        status: HttpStatus.OK,
      };

      service.findMetadataResult.mockResolvedValue(mockMetadata);
      mockResponseUtils.format.mockReturnValue(expectedResponse);

      const result = await controller.findMetadata();

      expect(service.findMetadataResult).toHaveBeenCalledWith(
        resultsUtil.resultId,
      );
      expect(result).toEqual(expectedResponse);
    });
  });

  describe('formalizeAIResult', () => {
    it('should formalize AI result', async () => {
      const aiResultDto: any = {
        title: 'AI Generated Result',
        description: 'AI Generated Description',
        contract_code: 'AI-001',
        year: 2023,
        indicator: 'Test Indicator',
      };
      const expectedResponse = {
        data: mockResult,
        description: 'AI Result created',
        status: HttpStatus.CREATED,
      };

      service.formalizeResult.mockResolvedValue(mockResult as any);
      mockResponseUtils.format.mockReturnValue(expectedResponse);

      const result = await controller.formalizeAIResult(aiResultDto);

      expect(service.formalizeResult).toHaveBeenCalledWith(aiResultDto);
      expect(result).toEqual(expectedResponse);
    });

    it('should handle AI formalization errors', async () => {
      const aiResultDto: any = {
        contract_code: 'INVALID',
        year: 2023,
        indicator: 'Test',
        title: 'Test',
        description: 'Test',
      };
      const error = new Error('AI formalization failed');
      service.formalizeResult.mockRejectedValue(error);

      await expect(controller.formalizeAIResult(aiResultDto)).rejects.toThrow(
        'AI formalization failed',
      );
    });
  });

  describe('saveGeoLocation', () => {
    it('should save geo location', async () => {
      const geoLocationDto: any = {
        countries: [{ id: 1, name: 'Colombia' }],
        regions: [{ id: 1, name: 'Latin America' }],
      };
      const expectedResponse = {
        description: 'Geo Location was saved correctly',
        data: mockResult,
        status: HttpStatus.OK,
      };

      service.saveGeoLocation.mockResolvedValue(mockResult);
      mockResponseUtils.format.mockReturnValue(expectedResponse);

      const result = await controller.saveGeoLocation(geoLocationDto);

      expect(service.saveGeoLocation).toHaveBeenCalledWith(
        resultsUtil.resultId,
        geoLocationDto,
      );
      expect(result).toEqual(expectedResponse);
    });
  });

  describe('findGeoLocation', () => {
    it('should find geo location', async () => {
      const mockGeoLocation: any = {
        countries: [],
        regions: [],
        geo_scope_id: 1,
      };
      const expectedResponse = {
        description: 'Geo Location was found correctly',
        data: mockGeoLocation,
        status: HttpStatus.OK,
      };

      service.findGeoLocation.mockResolvedValue(mockGeoLocation);
      mockResponseUtils.format.mockReturnValue(expectedResponse);

      const result = await controller.findGeoLocation();

      expect(service.findGeoLocation).toHaveBeenCalledWith(
        resultsUtil.resultId,
      );
      expect(result).toEqual(expectedResponse);
    });
  });

  describe('findLastUpdatedResults', () => {
    it('should find last updated results with default limit', async () => {
      const mockLastUpdated = [mockResult];
      const expectedResponse = {
        description: 'Results found',
        data: mockLastUpdated,
        status: HttpStatus.OK,
      };

      service.findLastUpdatedResultByCurrentUser.mockResolvedValue(
        mockLastUpdated,
      );
      mockResponseUtils.format.mockReturnValue(expectedResponse);

      const result = await controller.findLastUpdatedResults();

      expect(service.findLastUpdatedResultByCurrentUser).toHaveBeenCalledWith(
        3,
      );
      expect(result).toEqual(expectedResponse);
    });

    it('should find last updated results with custom limit', async () => {
      const mockLastUpdated = [mockResult];
      service.findLastUpdatedResultByCurrentUser.mockResolvedValue(
        mockLastUpdated,
      );
      mockResponseUtils.format.mockReturnValue({});

      await controller.findLastUpdatedResults(5);

      expect(service.findLastUpdatedResultByCurrentUser).toHaveBeenCalledWith(
        5,
      );
    });

    it('should handle large limit values', async () => {
      service.findLastUpdatedResultByCurrentUser.mockResolvedValue([]);
      mockResponseUtils.format.mockReturnValue({});

      await controller.findLastUpdatedResults(100);

      expect(service.findLastUpdatedResultByCurrentUser).toHaveBeenCalledWith(
        100,
      );
    });
  });

  describe('Response Formatting', () => {
    it('should format responses correctly for all endpoints', async () => {
      service.findResults.mockResolvedValue([]);

      await controller.find(
        '1',
        '10',
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        'asc',
        [],
        [],
        [],
        [],
        [],
        [],
        [],
        [],
        [],
      );

      expect(mockResponseUtils.format).toHaveBeenCalledWith({
        description: 'Results found',
        status: HttpStatus.OK,
        data: [],
      });
    });

    it('should handle different HTTP status codes', async () => {
      const createResultDto: any = { contract_id: 'TEST', year: 2023 };
      service.createResult.mockResolvedValue(mockResult);

      await controller.createResult(createResultDto);

      expect(mockResponseUtils.format).toHaveBeenCalledWith(
        expect.objectContaining({
          status: HttpStatus.CREATED,
        }),
      );
    });
  });

  describe('Error Handling', () => {
    it('should propagate service errors correctly', async () => {
      const error = new Error('Service unavailable');
      service.findResults.mockRejectedValue(error);

      await expect(
        controller.find(
          '1',
          '10',
          false,
          false,
          false,
          false,
          false,
          false,
          false,
          false,
          'asc',
          [],
          [],
          [],
          [],
          [],
          [],
          [],
          [],
          [],
        ),
      ).rejects.toThrow('Service unavailable');
    });

    it('should handle network timeout errors', async () => {
      const timeoutError = new Error('Request timeout');
      service.createResult.mockRejectedValue(timeoutError);

      await expect(
        controller.createResult({ contract_id: 'TEST', year: 2023 } as any),
      ).rejects.toThrow('Request timeout');
    });
  });

  describe('Parameter Conversion', () => {
    it('should convert string parameters to numbers correctly', async () => {
      service.findResults.mockResolvedValue([]);
      mockResponseUtils.format.mockReturnValue({});

      await controller.find(
        '99',
        '50',
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        'asc',
        [],
        [],
        [],
        [],
        [],
        [],
        [],
        [],
        [],
      );

      expect(service.findResults).toHaveBeenCalledWith(
        expect.objectContaining({
          page: 99,
          limit: 50,
        }),
      );
    });

    it('should handle boolean query parameters', async () => {
      service.findResults.mockResolvedValue([]);
      mockResponseUtils.format.mockReturnValue({});

      await controller.find(
        '1',
        '10',
        true,
        false,
        true,
        false,
        true,
        false,
        true,
        false,
        'asc',
        [],
        [],
        [],
        [],
        [],
        [],
        [],
        [],
        [],
      );

      expect(service.findResults).toHaveBeenCalledWith(
        expect.objectContaining({
          contracts: true,
          primary_contract: false,
          levers: true,
          primary_lever: false,
          indicators: true,
          result_status: false,
          result_audit_data: true,
          result_audit_data_objects: false,
        }),
      );
    });
  });

  describe('Complex Scenarios', () => {
    it('should handle concurrent requests', async () => {
      service.findResults.mockResolvedValue([mockResult]);
      service.findGeneralInfo.mockResolvedValue(mockResult);
      mockResponseUtils.format.mockReturnValue({});

      const findPromise = controller.find(
        '1',
        '10',
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        'asc',
        [],
        [],
        [],
        [],
        [],
        [],
        [],
        [],
        [],
      );
      const findGeneralPromise = controller.findGeneralInformation();

      await Promise.all([findPromise, findGeneralPromise]);

      expect(service.findResults).toHaveBeenCalledTimes(1);
      expect(service.findGeneralInfo).toHaveBeenCalledTimes(1);
    });

    it('should handle large datasets', async () => {
      const largeDataset = Array(1000).fill(mockResult);
      service.findResults.mockResolvedValue(largeDataset);
      mockResponseUtils.format.mockReturnValue({ data: largeDataset });

      const result = await controller.find(
        '1',
        '1000',
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        false,
        'asc',
        [],
        [],
        [],
        [],
        [],
        [],
        [],
        [],
        [],
      );

      expect(result.data).toHaveLength(1000);
    });
  });
});
