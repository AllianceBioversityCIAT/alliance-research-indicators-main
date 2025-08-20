import { Test, TestingModule } from '@nestjs/testing';
import { ResultOicrController } from './result-oicr.controller';
import { ResultOicrService } from './result-oicr.service';
import { ResultsUtil } from '../../shared/utils/results.util';
import { CreateStepsOicrDto } from './dto/create-steps-oicr.dto';

describe('ResultOicrController', () => {
  let controller: ResultOicrController;
  let mockResultOicrService: jest.Mocked<ResultOicrService>;
  let mockResultUtil: jest.Mocked<ResultsUtil>;

  beforeEach(async () => {
    // Create mocks for all dependencies
    mockResultOicrService = {
      createOicrSteps: jest.fn(),
      findByResultIdAndSteps: jest.fn(),
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
      const expectedResult = { success: true };

      mockResultOicrService.createOicrSteps.mockResolvedValue(
        expectedResult as any,
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
      const expectedResult = { success: true };

      mockResultOicrService.createOicrSteps.mockResolvedValue(
        expectedResult as any,
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
      const expectedResult = { success: true };

      mockResultOicrService.createOicrSteps.mockResolvedValue(
        expectedResult as any,
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
      const expectedResult = { affected: 1 };

      mockResultOicrService.createOicrSteps.mockResolvedValue(
        expectedResult as any,
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
      const expectedResult = { affected: 1 };

      mockResultOicrService.createOicrSteps.mockResolvedValue(
        expectedResult as any,
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
      const expectedResult = {
        main_contact_person: { user_id: 456 },
        tagging: [{ tag_id: 1 }],
        linked_result: [{ other_result_id: 789 }],
        outcome_impact_statement: 'Test statement',
      };

      mockResultOicrService.findByResultIdAndSteps = jest
        .fn()
        .mockResolvedValue(expectedResult);

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
      const expectedResult = {
        initiatives: [{ clarisa_initiative_id: 1 }],
        primary_lever: [{ lever_id: '1', is_primary: true }],
        contributor_lever: [{ lever_id: '2', is_primary: false }],
      };

      mockResultOicrService.findByResultIdAndSteps = jest
        .fn()
        .mockResolvedValue(expectedResult);

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
      const expectedResult = {
        geo_scope_id: 1,
        countries: [],
        regions: [],
      };

      mockResultOicrService.findByResultIdAndSteps = jest
        .fn()
        .mockResolvedValue(expectedResult);

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
      const expectedResult = 'Test general comment';

      mockResultOicrService.findByResultIdAndSteps = jest
        .fn()
        .mockResolvedValue(expectedResult);

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
});
