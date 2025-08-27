import { Test, TestingModule } from '@nestjs/testing';
import { ResultOicrController } from './result-oicr.controller';
import { ResultOicrService } from './result-oicr.service';
import { ResultsUtil } from '../../shared/utils/results.util';
import { CreateStepsOicrDto } from './dto/create-steps-oicr.dto';
import { CreateResultOicrDto } from './dto/create-result-oicr.dto';
import { HttpStatus } from '@nestjs/common';

describe('ResultOicrController', () => {
  let controller: ResultOicrController;
  let mockResultOicrService: jest.Mocked<ResultOicrService>;
  let mockResultUtil: jest.Mocked<ResultsUtil>;

  beforeEach(async () => {
    // Create mocks for all dependencies
    mockResultOicrService = {
      createOicrSteps: jest.fn(),
      findByResultIdAndSteps: jest.fn(),
      createOicr: jest.fn(),
      create: jest.fn(),
      stepOneOicr: jest.fn(),
      stepTwoOicr: jest.fn(),
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
    it('should call createOicrSteps with correct parameters for step 1', async () => {
      // Arrange
      const data: CreateStepsOicrDto = {
        main_contact_person: { user_id: 456 },
        tagging: [{ tag_id: 1 }],
        linked_result: [{ other_result_id: 789 }],
        outcome_impact_statement: 'Test statement',
      } as any;
      const step = 1;
      const serviceResult = { success: true };
      const expectedResult = {
        data: serviceResult,
        description: 'Result OICR steps updated successfully',
        status: HttpStatus.OK,
      };

      mockResultOicrService.createOicrSteps.mockResolvedValue(
        serviceResult as any,
      );

      // Act
      const result = await controller.updateResultOicrSteps(data, step);

      // Assert
      expect(mockResultOicrService.createOicrSteps).toHaveBeenCalledWith(
        mockResultUtil.resultId,
        data,
        step,
      );
      expect(result).toEqual(expectedResult);
    });

    it('should call createOicrSteps with correct parameters for step 2', async () => {
      // Arrange
      const data: CreateStepsOicrDto = {
        initiatives: [{ clarisa_initiative_id: 1 }],
        primary_lever: [{ lever_id: '1' }],
        contributor_lever: [{ lever_id: '2' }],
      } as any;
      const step = 2;
      const serviceResult = { success: true };
      const expectedResult = {
        data: serviceResult,
        description: 'Result OICR steps updated successfully',
        status: HttpStatus.OK,
      };

      mockResultOicrService.createOicrSteps.mockResolvedValue(
        serviceResult as any,
      );

      // Act
      const result = await controller.updateResultOicrSteps(data, step);

      // Assert
      expect(mockResultOicrService.createOicrSteps).toHaveBeenCalledWith(
        mockResultUtil.resultId,
        data,
        step,
      );
      expect(result).toEqual(expectedResult);
    });

    it('should call createOicrSteps with correct parameters for step 3 (geo location)', async () => {
      // Arrange
      const data: CreateStepsOicrDto = {
        geo_scope_id: 1,
        countries: [],
        regions: [],
        comment_geo_scope: 'Test geo comment',
      } as any;
      const step = 3;
      const serviceResult = { success: true };
      const expectedResult = {
        data: serviceResult,
        description: 'Result OICR steps updated successfully',
        status: HttpStatus.OK,
      };

      mockResultOicrService.createOicrSteps.mockResolvedValue(
        serviceResult as any,
      );

      // Act
      const result = await controller.updateResultOicrSteps(data, step);

      // Assert
      expect(mockResultOicrService.createOicrSteps).toHaveBeenCalledWith(
        mockResultUtil.resultId,
        data,
        step,
      );
      expect(result).toEqual(expectedResult);
    });

    it('should call createOicrSteps with correct parameters for step 4 (general comment)', async () => {
      // Arrange
      const data: CreateStepsOicrDto = {
        general_comment: 'Test general comment',
      } as any;
      const step = 4;
      const serviceResult = { affected: 1 };
      const expectedResult = {
        data: serviceResult,
        description: 'Result OICR steps updated successfully',
        status: HttpStatus.OK,
      };

      mockResultOicrService.createOicrSteps.mockResolvedValue(
        serviceResult as any,
      );

      // Act
      const result = await controller.updateResultOicrSteps(data, step);

      // Assert
      expect(mockResultOicrService.createOicrSteps).toHaveBeenCalledWith(
        mockResultUtil.resultId,
        data,
        step,
      );
      expect(result).toEqual(expectedResult);
    });

    it('should handle service errors properly', async () => {
      // Arrange
      const data: CreateStepsOicrDto = {
        general_comment: 'Test comment',
      } as any;
      const step = 1;
      const serviceError = new Error('Service error');

      mockResultOicrService.createOicrSteps.mockRejectedValue(serviceError);

      // Act & Assert
      await expect(
        controller.updateResultOicrSteps(data, step),
      ).rejects.toThrow('Service error');
      expect(mockResultOicrService.createOicrSteps).toHaveBeenCalledWith(
        mockResultUtil.resultId,
        data,
        step,
      );
    });

    it('should work with empty data object', async () => {
      // Arrange
      const data: CreateStepsOicrDto = {} as any;
      const step = 4;
      const serviceResult = { affected: 1 };
      const expectedResult = {
        data: serviceResult,
        description: 'Result OICR steps updated successfully',
        status: HttpStatus.OK,
      };

      mockResultOicrService.createOicrSteps.mockResolvedValue(
        serviceResult as any,
      );

      // Act
      const result = await controller.updateResultOicrSteps(data, step);

      // Assert
      expect(mockResultOicrService.createOicrSteps).toHaveBeenCalledWith(
        mockResultUtil.resultId,
        data,
        step,
      );
      expect(result).toEqual(expectedResult);
    });

    it('should use resultId from ResultsUtil', async () => {
      // Arrange
      const customResultId = 456;
      Object.defineProperty(mockResultUtil, 'resultId', {
        value: customResultId,
        writable: true,
      });

      const data: CreateStepsOicrDto = {
        general_comment: 'Test comment',
      } as any;
      const step = 1;
      const expectedResult = { success: true };

      mockResultOicrService.createOicrSteps.mockResolvedValue(
        expectedResult as any,
      );

      // Act
      await controller.updateResultOicrSteps(data, step);

      // Assert
      expect(mockResultOicrService.createOicrSteps).toHaveBeenCalledWith(
        customResultId,
        data,
        step,
      );
    });
  });

  describe('getResultOicrSteps', () => {
    it('should call findByResultIdAndSteps with correct parameters for step 1', async () => {
      // Arrange
      const step = 1;
      const serviceResult = {
        main_contact_person: { user_id: 456 },
        tagging: [{ tag_id: 1 }],
        linked_result: [{ other_result_id: 789 }],
        outcome_impact_statement: 'Test statement',
      };
      const expectedResult = {
        data: serviceResult,
        description: 'Result OICR steps retrieved successfully',
        status: HttpStatus.OK,
      };

      mockResultOicrService.findByResultIdAndSteps = jest
        .fn()
        .mockResolvedValue(serviceResult);

      // Act
      const result = await controller.getResultOicrSteps(step);

      // Assert
      expect(mockResultOicrService.findByResultIdAndSteps).toHaveBeenCalledWith(
        mockResultUtil.resultId,
        step,
      );
      expect(result).toEqual(expectedResult);
    });

    it('should call findByResultIdAndSteps with correct parameters for step 2', async () => {
      // Arrange
      const step = 2;
      const serviceResult = {
        initiatives: [{ clarisa_initiative_id: 1 }],
        primary_lever: [{ lever_id: '1', is_primary: true }],
        contributor_lever: [{ lever_id: '2', is_primary: false }],
      };
      const expectedResult = {
        data: serviceResult,
        description: 'Result OICR steps retrieved successfully',
        status: HttpStatus.OK,
      };

      mockResultOicrService.findByResultIdAndSteps = jest
        .fn()
        .mockResolvedValue(serviceResult);

      // Act
      const result = await controller.getResultOicrSteps(step);

      // Assert
      expect(mockResultOicrService.findByResultIdAndSteps).toHaveBeenCalledWith(
        mockResultUtil.resultId,
        step,
      );
      expect(result).toEqual(expectedResult);
    });

    it('should call findByResultIdAndSteps with correct parameters for step 3', async () => {
      // Arrange
      const step = 3;
      const serviceResult = {
        geo_scope_id: 1,
        countries: [],
        regions: [],
      };
      const expectedResult = {
        data: serviceResult,
        description: 'Result OICR steps retrieved successfully',
        status: HttpStatus.OK,
      };

      mockResultOicrService.findByResultIdAndSteps = jest
        .fn()
        .mockResolvedValue(serviceResult);

      // Act
      const result = await controller.getResultOicrSteps(step);

      // Assert
      expect(mockResultOicrService.findByResultIdAndSteps).toHaveBeenCalledWith(
        mockResultUtil.resultId,
        step,
      );
      expect(result).toEqual(expectedResult);
    });

    it('should call findByResultIdAndSteps with correct parameters for step 4', async () => {
      // Arrange
      const step = 4;
      const serviceResult = 'Test general comment';
      const expectedResult = {
        data: serviceResult,
        description: 'Result OICR steps retrieved successfully',
        status: HttpStatus.OK,
      };

      mockResultOicrService.findByResultIdAndSteps = jest
        .fn()
        .mockResolvedValue(serviceResult);

      // Act
      const result = await controller.getResultOicrSteps(step);

      // Assert
      expect(mockResultOicrService.findByResultIdAndSteps).toHaveBeenCalledWith(
        mockResultUtil.resultId,
        step,
      );
      expect(result).toEqual(expectedResult);
    });

    it('should handle service errors properly', async () => {
      // Arrange
      const step = 1;
      const serviceError = new Error('Service error');

      mockResultOicrService.findByResultIdAndSteps = jest
        .fn()
        .mockRejectedValue(serviceError);

      // Act & Assert
      await expect(controller.getResultOicrSteps(step)).rejects.toThrow(
        'Service error',
      );
      expect(mockResultOicrService.findByResultIdAndSteps).toHaveBeenCalledWith(
        mockResultUtil.resultId,
        step,
      );
    });

    it('should use resultId from ResultsUtil', async () => {
      // Arrange
      const customResultId = 456;
      Object.defineProperty(mockResultUtil, 'resultId', {
        value: customResultId,
        writable: true,
      });

      const step = 1;
      const expectedResult = { success: true };

      mockResultOicrService.findByResultIdAndSteps = jest
        .fn()
        .mockResolvedValue(expectedResult);

      // Act
      await controller.getResultOicrSteps(step);

      // Assert
      expect(mockResultOicrService.findByResultIdAndSteps).toHaveBeenCalledWith(
        customResultId,
        step,
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
        description: 'Result OICR created successfully',
        status: HttpStatus.CREATED,
      };

      mockResultOicrService.createOicr.mockResolvedValue(
        expectedServiceResult as any,
      );

      // Act
      const result = await controller.createResultOicr(mockCreateData);

      // Assert
      expect(mockResultOicrService.createOicr).toHaveBeenCalledWith(
        mockCreateData,
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
      await expect(controller.createResultOicr(mockCreateData)).rejects.toThrow(
        'Service error occurred',
      );
      expect(mockResultOicrService.createOicr).toHaveBeenCalledWith(
        mockCreateData,
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
      const result = await controller.createResultOicr(mockCreateData);

      // Assert
      expect(mockResultOicrService.createOicr).toHaveBeenCalledWith(
        mockCreateData,
      );
      expect(result.data).toEqual(expectedServiceResult);
      expect(result.status).toBe(HttpStatus.CREATED);
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
      const result = await controller.createResultOicr(mockCreateData);

      // Assert
      expect(result).toHaveProperty('data');
      expect(result).toHaveProperty('description');
      expect(result).toHaveProperty('status');
      expect(result.data).toEqual(serviceResult);
      expect(result.description).toBe('Result OICR created successfully');
      expect(result.status).toBe(HttpStatus.CREATED);
    });
  });
});
