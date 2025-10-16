import { Test, TestingModule } from '@nestjs/testing';
import { ResultOicrController } from './result-oicr.controller';
import { ResultOicrService } from './result-oicr.service';
import { ResultsUtil } from '../../shared/utils/results.util';
import { UpdateOicrDto } from './dto/update-oicr.dto';
import { CreateResultOicrDto } from './dto/create-result-oicr.dto';
import { HttpStatus } from '@nestjs/common';

describe('ResultOicrController', () => {
  let controller: ResultOicrController;
  let mockResultOicrService: jest.Mocked<ResultOicrService>;
  let mockResultUtil: jest.Mocked<ResultsUtil>;

  beforeEach(async () => {
    // Create mocks for all dependencies
    mockResultOicrService = {
      updateOicr: jest.fn(),
      findOicrs: jest.fn(),
      createOicr: jest.fn(),
    } as any;

    mockResultUtil = {
      resultId: 123,
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ResultOicrController],
      providers: [
        { provide: ResultOicrService, useValue: mockResultOicrService },
        { provide: ResultsUtil, useValue: mockResultUtil },
      ],
    }).compile();

    controller = module.get<ResultOicrController>(ResultOicrController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('updateResultOicrSteps', () => {
    it('should call updateOicr with correct parameters', async () => {
      // Arrange
      const data: UpdateOicrDto = {
        oicr_internal_code: 'TEST-001',
        tagging: { tag_id: 1 } as any,
        outcome_impact_statement: 'Test outcome statement',
        short_outcome_impact_statement: 'Short statement',
        general_comment: 'Test comment',
        maturity_level_id: 1,
        link_result: { temp_result_id: 123 } as any,
        actual_count: [],
        extrapolate_estimates: [],
        notable_references: [],
      };
      const serviceResult = { success: true };
      const expectedResult = {
        data: serviceResult,
        description: 'Result OICR updated successfully',
        status: HttpStatus.OK,
      };

      mockResultOicrService.updateOicr.mockResolvedValue(serviceResult as any);

      // Act
      const result = await controller.updateResultOicrSteps(data);

      // Assert
      expect(mockResultOicrService.updateOicr).toHaveBeenCalledWith(
        mockResultUtil.resultId,
        data,
      );
      expect(result).toEqual(expectedResult);
    });

    it('should handle service errors properly', async () => {
      // Arrange
      const data: UpdateOicrDto = {
        oicr_internal_code: 'TEST-001',
        tagging: null as any,
        outcome_impact_statement: 'Test statement',
        short_outcome_impact_statement: 'Short statement',
        general_comment: 'Test comment',
        maturity_level_id: 1,
        link_result: null as any,
        actual_count: [],
        extrapolate_estimates: [],
        notable_references: [],
      };
      const serviceError = new Error('Service error');

      mockResultOicrService.updateOicr.mockRejectedValue(serviceError);

      // Act & Assert
      await expect(controller.updateResultOicrSteps(data)).rejects.toThrow(
        'Service error',
      );
      expect(mockResultOicrService.updateOicr).toHaveBeenCalledWith(
        mockResultUtil.resultId,
        data,
      );
    });

    it('should use resultId from ResultsUtil', async () => {
      // Arrange
      const customResultId = 456;
      Object.defineProperty(mockResultUtil, 'resultId', {
        value: customResultId,
        writable: true,
      });

      const data: UpdateOicrDto = {
        oicr_internal_code: 'TEST-002',
        tagging: null as any,
        outcome_impact_statement: 'Test statement',
        short_outcome_impact_statement: 'Short statement',
        general_comment: 'Test comment',
        maturity_level_id: 2,
        link_result: null as any,
        actual_count: [],
        extrapolate_estimates: [],
        notable_references: [],
      };
      const expectedResult = { success: true };

      mockResultOicrService.updateOicr.mockResolvedValue(expectedResult as any);

      // Act
      await controller.updateResultOicrSteps(data);

      // Assert
      expect(mockResultOicrService.updateOicr).toHaveBeenCalledWith(
        customResultId,
        data,
      );
    });
  });

  describe('getResultOicrSteps', () => {
    it('should call findOicrs with correct parameters', async () => {
      // Arrange
      const serviceResult: UpdateOicrDto = {
        oicr_internal_code: 'TEST-001',
        tagging: { tag_id: 1 } as any,
        outcome_impact_statement: 'Test outcome statement',
        short_outcome_impact_statement: 'Short statement',
        general_comment: 'Test comment',
        maturity_level_id: 1,
        link_result: { temp_result_id: 123 } as any,
        actual_count: [],
        extrapolate_estimates: [],
        notable_references: [],
      };
      const expectedResult = {
        data: serviceResult,
        description: 'Result OICR steps retrieved successfully',
        status: HttpStatus.OK,
      };

      mockResultOicrService.findOicrs.mockResolvedValue(serviceResult);

      // Act
      const result = await controller.getResultOicrSteps();

      // Assert
      expect(mockResultOicrService.findOicrs).toHaveBeenCalledWith(
        mockResultUtil.resultId,
      );
      expect(result).toEqual(expectedResult);
    });

    it('should handle service errors properly', async () => {
      // Arrange
      const serviceError = new Error('Service error');

      mockResultOicrService.findOicrs.mockRejectedValue(serviceError);

      // Act & Assert
      await expect(controller.getResultOicrSteps()).rejects.toThrow(
        'Service error',
      );
      expect(mockResultOicrService.findOicrs).toHaveBeenCalledWith(
        mockResultUtil.resultId,
      );
    });

    it('should use resultId from ResultsUtil', async () => {
      // Arrange
      const customResultId = 456;
      Object.defineProperty(mockResultUtil, 'resultId', {
        value: customResultId,
        writable: true,
      });

      const expectedResult: UpdateOicrDto = {
        oicr_internal_code: 'TEST-002',
        tagging: null as any,
        outcome_impact_statement: 'Test statement',
        short_outcome_impact_statement: 'Short statement',
        general_comment: 'Test comment',
        maturity_level_id: 2,
        link_result: null as any,
        actual_count: [],
        extrapolate_estimates: [],
        notable_references: [],
      };

      mockResultOicrService.findOicrs.mockResolvedValue(expectedResult);

      // Act
      await controller.getResultOicrSteps();

      // Assert
      expect(mockResultOicrService.findOicrs).toHaveBeenCalledWith(
        customResultId,
      );
    });
  });

  describe('createResultOicr', () => {
    it('should create a complete OICR result successfully', async () => {
      // Arrange
      const mockCreateData: CreateResultOicrDto = {
        base_information: {
          result_type_id: 1,
          title: 'Test OICR Result',
          description: 'Test Description',
        } as any,
        step_one: {
          outcome_impact_statement: 'Test outcome statement',
          main_contact_person: { user_id: 123 },
          tagging: [{ tag_id: 1 }],
          linked_result: [{ other_result_id: 456 }],
        } as any,
        step_two: {
          initiatives: [{ clarisa_initiative_id: 1 }],
          primary_lever: [{ lever_id: 1 }],
          contributor_lever: [{ lever_id: 2 }],
        } as any,
        step_three: {
          geo_scope_id: 1,
          regions: [],
          countries: [],
        } as any,
        step_four: {
          general_comment: 'Test general comment',
        },
      };

      const expectedServiceResult = {
        result_id: 123,
        id: 1,
        title: 'Test OICR Result',
      };

      const expectedResponse = {
        data: expectedServiceResult,
        description: 'Result OICR updated successfully',
        status: HttpStatus.OK,
        errors: undefined,
      };

      mockResultOicrService.createOicr.mockResolvedValue(
        expectedServiceResult as any,
      );

      // Act
      const result = await controller.createResultOicr(
        mockCreateData,
        'TEST-001',
      );

      // Assert
      expect(mockResultOicrService.createOicr).toHaveBeenCalledWith(
        mockCreateData,
        undefined,
        'STAR',
        undefined,
      );
      expect(result).toEqual(expectedResponse);
    });

    it('should handle service errors when creating OICR result', async () => {
      // Arrange
      const mockCreateData: CreateResultOicrDto = {
        base_information: {
          result_type_id: 1,
          title: 'Test OICR Result',
        } as any,
        step_one: {} as any,
        step_two: {} as any,
        step_three: {} as any,
        step_four: { general_comment: 'Test' },
      };

      const serviceError = new Error('Service error occurred');
      mockResultOicrService.createOicr.mockRejectedValue(serviceError);

      // Act & Assert
      await expect(
        controller.createResultOicr(mockCreateData, 'TEST-001'),
      ).rejects.toThrow('Service error occurred');
      expect(mockResultOicrService.createOicr).toHaveBeenCalledWith(
        mockCreateData,
        undefined,
        'STAR',
        undefined,
      );
    });

    it('should handle empty step data when creating OICR result', async () => {
      // Arrange
      const mockCreateData: CreateResultOicrDto = {
        base_information: {
          result_type_id: 1,
          title: 'Minimal OICR Result',
        } as any,
        step_one: {
          outcome_impact_statement: '',
          main_contact_person: null,
          tagging: [],
          linked_result: [],
        } as any,
        step_two: {
          initiatives: [],
          primary_lever: [],
          contributor_lever: [],
        } as any,
        step_three: {
          geo_scope_id: null,
          regions: [],
          countries: [],
        } as any,
        step_four: {
          general_comment: '',
        },
      };

      const expectedServiceResult = {
        result_id: 456,
        id: 2,
        title: 'Minimal OICR Result',
      };

      mockResultOicrService.createOicr.mockResolvedValue(
        expectedServiceResult as any,
      );

      // Act
      const result = await controller.createResultOicr(
        mockCreateData,
        'TEST-001',
      );

      // Assert
      expect(mockResultOicrService.createOicr).toHaveBeenCalledWith(
        mockCreateData,
        undefined,
        'STAR',
        undefined,
      );
      expect(result.data).toEqual(expectedServiceResult);
      expect(result.status).toBe(HttpStatus.OK);
    });

    it('should format response correctly with all required fields', async () => {
      // Arrange
      const mockCreateData: CreateResultOicrDto = {
        base_information: { result_type_id: 1, title: 'Test' } as any,
        step_one: {} as any,
        step_two: {} as any,
        step_three: {} as any,
        step_four: { general_comment: 'Test' },
      };

      const serviceResult = { result_id: 789, id: 3 };
      mockResultOicrService.createOicr.mockResolvedValue(serviceResult as any);

      // Act
      const result = await controller.createResultOicr(
        mockCreateData,
        'TEST-001',
      );

      // Assert
      expect(result).toHaveProperty('data');
      expect(result).toHaveProperty('description');
      expect(result).toHaveProperty('status');
      expect(result.data).toEqual(serviceResult);
      expect(result.description).toBe('Result OICR updated successfully');
      expect(result.status).toBe(HttpStatus.OK);
    });
  });
});
