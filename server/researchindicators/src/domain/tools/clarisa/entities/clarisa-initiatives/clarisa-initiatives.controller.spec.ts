import { Test, TestingModule } from '@nestjs/testing';
import { HttpStatus } from '@nestjs/common';
import { ClarisaInitiativesController } from './clarisa-initiatives.controller';
import { ClarisaInitiativesService } from './clarisa-initiatives.service';
import { ResponseUtils } from '../../../../shared/utils/response.utils';

// Mock ResponseUtils
jest.mock('../../../../shared/utils/response.utils');

describe('ClarisaInitiativesController', () => {
  let controller: ClarisaInitiativesController;
  let service: ClarisaInitiativesService;

  const mockClarisaInitiativesService = {
    findAll: jest.fn(),
    findOne: jest.fn(),
    findByName: jest.fn(),
    findByNames: jest.fn(),
  };

  const mockResponseUtils = {
    format: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ClarisaInitiativesController],
      providers: [
        {
          provide: ClarisaInitiativesService,
          useValue: mockClarisaInitiativesService,
        },
      ],
    }).compile();

    controller = module.get<ClarisaInitiativesController>(
      ClarisaInitiativesController,
    );
    service = module.get<ClarisaInitiativesService>(ClarisaInitiativesService);

    // Reset mocks
    (ResponseUtils.format as jest.Mock) = mockResponseUtils.format;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('constructor', () => {
    it('should initialize with correct parameters', () => {
      expect(controller).toBeInstanceOf(ClarisaInitiativesController);
      expect(controller['service']).toBe(service);
      expect(controller['dataName']).toBe('Initiative');
    });
  });

  describe('find (GET /)', () => {
    const mockInitiatives = [
      {
        id: 1,
        name: 'Climate Adaptation Initiative',
        short_name: 'CAI',
        official_code: 'CAI-001',
        type_id: 1,
        active: true,
        status: 'Active',
        is_active: true,
      },
      {
        id: 2,
        name: 'Food Security Program',
        short_name: 'FSP',
        official_code: 'FSP-002',
        type_id: 2,
        active: true,
        status: 'Active',
        is_active: true,
      },
    ];

    const mockFormattedResponse = {
      description: 'Initiative found',
      data: mockInitiatives,
      status: HttpStatus.OK,
    };

    beforeEach(() => {
      mockClarisaInitiativesService.findAll.mockResolvedValue(mockInitiatives);
      mockResponseUtils.format.mockReturnValue(mockFormattedResponse);
    });

    it('should return all initiatives with formatted response', async () => {
      const result = await controller.find();

      expect(mockClarisaInitiativesService.findAll).toHaveBeenCalledWith();
      expect(ResponseUtils.format).toHaveBeenCalledWith({
        description: 'Initiative found',
        data: mockInitiatives,
        status: HttpStatus.OK,
      });
      expect(result).toEqual(mockFormattedResponse);
    });

    it('should handle empty initiatives list', async () => {
      const emptyInitiatives: any[] = [];
      mockClarisaInitiativesService.findAll.mockResolvedValue(emptyInitiatives);

      const emptyResponse = {
        description: 'Initiative found',
        data: emptyInitiatives,
        status: HttpStatus.OK,
      };
      mockResponseUtils.format.mockReturnValue(emptyResponse);

      const result = await controller.find();

      expect(mockClarisaInitiativesService.findAll).toHaveBeenCalledWith();
      expect(ResponseUtils.format).toHaveBeenCalledWith({
        description: 'Initiative found',
        data: emptyInitiatives,
        status: HttpStatus.OK,
      });
      expect(result).toEqual(emptyResponse);
    });

    it('should handle initiatives with complex data structures', async () => {
      const complexInitiatives = [
        {
          id: 1,
          name: 'Complex Initiative',
          short_name: 'CI',
          official_code: 'CI-001',
          type_id: 1,
          active: true,
          status: 'Active',
          stageId: 2,
          description: 'A complex initiative',
          action_area_id: 3,
          action_area_description: 'Climate Action Area',
          stages: [
            { id: 1, active: true, stageId: 1, initvStgId: 101 },
            { id: 2, active: false, stageId: 2, initvStgId: 102 },
          ],
          is_active: true,
        },
      ];

      mockClarisaInitiativesService.findAll.mockResolvedValue(
        complexInitiatives,
      );
      mockResponseUtils.format.mockReturnValue({
        description: 'Initiative found',
        data: complexInitiatives,
        status: HttpStatus.OK,
      });

      const result = await controller.find();

      expect(result.data[0].stages).toBeDefined();
      expect(result.data[0].action_area_description).toBe(
        'Climate Action Area',
      );
    });

    it('should handle service errors', async () => {
      const error = new Error('Database error');
      mockClarisaInitiativesService.findAll.mockRejectedValue(error);

      await expect(controller.find()).rejects.toThrow('Database error');
      expect(mockClarisaInitiativesService.findAll).toHaveBeenCalledWith();
    });
  });

  describe('findById (GET /:id)', () => {
    const mockInitiative = {
      id: 1,
      name: 'Climate Adaptation Initiative',
      short_name: 'CAI',
      official_code: 'CAI-001',
      active: true,
      is_active: true,
    };

    const mockFormattedResponse = {
      description: 'Initiative found',
      data: mockInitiative,
      status: HttpStatus.OK,
    };

    beforeEach(() => {
      mockClarisaInitiativesService.findOne.mockResolvedValue(mockInitiative);
      mockResponseUtils.format.mockReturnValue(mockFormattedResponse);
    });

    it('should return initiative by id with formatted response', async () => {
      const initiativeId = '1';
      const result = await controller.findById(initiativeId);

      expect(mockClarisaInitiativesService.findOne).toHaveBeenCalledWith(1);
      expect(ResponseUtils.format).toHaveBeenCalledWith({
        description: 'Initiative found',
        data: mockInitiative,
        status: HttpStatus.OK,
      });
      expect(result).toEqual(mockFormattedResponse);
    });

    it('should handle string id conversion', async () => {
      const initiativeId = '123';
      await controller.findById(initiativeId);

      expect(mockClarisaInitiativesService.findOne).toHaveBeenCalledWith(123);
    });

    it('should handle initiative not found', async () => {
      mockClarisaInitiativesService.findOne.mockResolvedValue(null);

      const nullResponse = {
        description: 'Initiative found',
        data: null,
        status: HttpStatus.OK,
      };
      mockResponseUtils.format.mockReturnValue(nullResponse);

      const result = await controller.findById('999');

      expect(mockClarisaInitiativesService.findOne).toHaveBeenCalledWith(999);
      expect(ResponseUtils.format).toHaveBeenCalledWith({
        description: 'Initiative found',
        data: null,
        status: HttpStatus.OK,
      });
      expect(result).toEqual(nullResponse);
    });

    it('should handle complex initiative data in response', async () => {
      const complexInitiative = {
        id: 1,
        name: 'Complex Initiative',
        short_name: 'CI',
        official_code: 'CI-001',
        type_id: 1,
        active: true,
        status: 'Active',
        stageId: 2,
        description: 'A complex initiative',
        action_area_id: 3,
        action_area_description: 'Climate Action Area',
        stages: [
          { id: 1, active: true, stageId: 1, initvStgId: 101 },
          { id: 2, active: false, stageId: 2, initvStgId: 102 },
        ],
        is_active: true,
      };

      mockClarisaInitiativesService.findOne.mockResolvedValue(
        complexInitiative,
      );
      mockResponseUtils.format.mockReturnValue({
        description: 'Initiative found',
        data: complexInitiative,
        status: HttpStatus.OK,
      });

      const result = await controller.findById('1');

      expect(result.data.stages).toBeDefined();
      expect(Array.isArray(result.data.stages)).toBe(true);
      expect(result.data.action_area_description).toBe('Climate Action Area');
    });

    it('should handle invalid id format', async () => {
      // This test assumes the route regex \\d+ prevents non-numeric IDs
      // but we can still test the conversion
      const initiativeId = '0';
      await controller.findById(initiativeId);

      expect(mockClarisaInitiativesService.findOne).toHaveBeenCalledWith(0);
    });

    it('should handle service errors', async () => {
      const error = new Error('Database error');
      mockClarisaInitiativesService.findOne.mockRejectedValue(error);

      await expect(controller.findById('1')).rejects.toThrow('Database error');
      expect(mockClarisaInitiativesService.findOne).toHaveBeenCalledWith(1);
    });
  });

  describe('inheritance from BaseController', () => {
    it('should have access to inherited methods', () => {
      expect(typeof controller.find).toBe('function');
      expect(typeof controller.findById).toBe('function');
    });

    it('should have correct service and dataName properties', () => {
      expect(controller['service']).toBe(service);
      expect(controller['dataName']).toBe('Initiative');
    });
  });

  describe('response formatting', () => {
    it('should use consistent response format for all endpoints', async () => {
      const mockData = {
        id: 1,
        name: 'Test Initiative',
        short_name: 'TI',
        official_code: 'TI-001',
      };
      mockClarisaInitiativesService.findAll.mockResolvedValue([mockData]);
      mockClarisaInitiativesService.findOne.mockResolvedValue(mockData);

      // Test findAll response format
      await controller.find();
      expect(ResponseUtils.format).toHaveBeenCalledWith({
        description: 'Initiative found',
        data: [mockData],
        status: HttpStatus.OK,
      });

      // Clear previous calls
      jest.clearAllMocks();
      mockResponseUtils.format.mockReturnValue({});

      // Test findById response format
      await controller.findById('1');
      expect(ResponseUtils.format).toHaveBeenCalledWith({
        description: 'Initiative found',
        data: mockData,
        status: HttpStatus.OK,
      });
    });

    it('should maintain dataName consistency in responses', async () => {
      mockClarisaInitiativesService.findAll.mockResolvedValue([]);

      await controller.find();

      expect(ResponseUtils.format).toHaveBeenCalledWith(
        expect.objectContaining({
          description: expect.stringContaining('Initiative'),
        }),
      );
    });
  });

  describe('HTTP methods and routing', () => {
    it('should handle GET requests for find method', () => {
      // This would be tested with actual HTTP requests in integration tests
      // Here we just verify the method exists and is callable
      expect(controller.find).toBeDefined();
      expect(typeof controller.find).toBe('function');
    });

    it('should handle GET requests with id parameter for findById method', () => {
      // This would be tested with actual HTTP requests in integration tests
      // Here we just verify the method exists and is callable
      expect(controller.findById).toBeDefined();
      expect(typeof controller.findById).toBe('function');
    });
  });

  describe('error propagation', () => {
    it('should propagate service errors without modification', async () => {
      const serviceError = new Error('Service specific error');
      mockClarisaInitiativesService.findAll.mockRejectedValue(serviceError);

      await expect(controller.find()).rejects.toThrow('Service specific error');
    });

    it('should propagate validation errors', async () => {
      const validationError = new Error('Validation failed');
      mockClarisaInitiativesService.findOne.mockRejectedValue(validationError);

      await expect(controller.findById('1')).rejects.toThrow(
        'Validation failed',
      );
    });
  });

  describe('Clarisa-specific features', () => {
    it('should handle initiatives with Clarisa-specific fields', async () => {
      const clarisaInitiatives = [
        {
          id: 1,
          name: 'CGIAR Initiative',
          short_name: 'CGIAR-1',
          official_code: 'CGIAR-001',
          type_id: 1,
          active: true,
          status: 'Implementation',
          stageId: 3,
          description: 'CGIAR research initiative',
          action_area_id: 1,
          action_area_description: 'Resilient Agrifood Systems',
          is_active: true,
        },
      ];

      mockClarisaInitiativesService.findAll.mockResolvedValue(
        clarisaInitiatives,
      );
      mockResponseUtils.format.mockReturnValue({
        description: 'Initiative found',
        data: clarisaInitiatives,
        status: HttpStatus.OK,
      });

      const result = await controller.find();

      expect(result.data[0].official_code).toBe('CGIAR-001');
      expect(result.data[0].action_area_description).toBe(
        'Resilient Agrifood Systems',
      );
    });

    it('should handle initiatives with stages data structure', async () => {
      const initiativeWithStages = {
        id: 1,
        name: 'Multi-Stage Initiative',
        stages: [
          { id: 1, active: true, stageId: 1, initvStgId: 101 },
          { id: 2, active: false, stageId: 2, initvStgId: 102 },
          { id: 3, active: true, stageId: 3, initvStgId: 103 },
        ],
        is_active: true,
      };

      mockClarisaInitiativesService.findOne.mockResolvedValue(
        initiativeWithStages,
      );
      mockResponseUtils.format.mockReturnValue({
        description: 'Initiative found',
        data: initiativeWithStages,
        status: HttpStatus.OK,
      });

      const result = await controller.findById('1');

      expect(result.data.stages).toHaveLength(3);
      expect(result.data.stages.filter((stage) => stage.active)).toHaveLength(
        2,
      );
    });

    it('should maintain API consistency for Clarisa endpoints', async () => {
      // Test that the controller follows Clarisa API patterns
      const mockData = { id: 1, name: 'Test', is_active: true };
      mockClarisaInitiativesService.findAll.mockResolvedValue([mockData]);

      await controller.find();

      // Verify the controller uses the expected dataName for Clarisa entities
      expect(ResponseUtils.format).toHaveBeenCalledWith(
        expect.objectContaining({
          description: 'Initiative found',
        }),
      );
    });
  });
});
