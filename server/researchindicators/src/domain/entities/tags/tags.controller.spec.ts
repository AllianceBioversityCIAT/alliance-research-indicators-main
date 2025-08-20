import { Test, TestingModule } from '@nestjs/testing';
import { HttpStatus } from '@nestjs/common';
import { TagsController } from './tags.controller';
import { TagsService } from './tags.service';
import { ResponseUtils } from '../../shared/utils/response.utils';

// Mock ResponseUtils
jest.mock('../../shared/utils/response.utils');

describe('TagsController', () => {
  let controller: TagsController;
  let service: TagsService;

  const mockTagsService = {
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
      controllers: [TagsController],
      providers: [
        {
          provide: TagsService,
          useValue: mockTagsService,
        },
      ],
    }).compile();

    controller = module.get<TagsController>(TagsController);
    service = module.get<TagsService>(TagsService);

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
      expect(controller).toBeInstanceOf(TagsController);
      expect(controller['service']).toBe(service);
      expect(controller['dataName']).toBe('Tag');
    });
  });

  describe('find (GET /)', () => {
    const mockTags = [
      { id: 1, name: 'Technology', is_active: true },
      { id: 2, name: 'Innovation', is_active: true },
    ];

    const mockFormattedResponse = {
      description: 'Tag found',
      data: mockTags,
      status: HttpStatus.OK,
    };

    beforeEach(() => {
      mockTagsService.findAll.mockResolvedValue(mockTags);
      mockResponseUtils.format.mockReturnValue(mockFormattedResponse);
    });

    it('should return all tags with formatted response', async () => {
      const result = await controller.find();

      expect(mockTagsService.findAll).toHaveBeenCalledWith();
      expect(ResponseUtils.format).toHaveBeenCalledWith({
        description: 'Tag found',
        data: mockTags,
        status: HttpStatus.OK,
      });
      expect(result).toEqual(mockFormattedResponse);
    });

    it('should handle empty tag list', async () => {
      const emptyTags: any[] = [];
      mockTagsService.findAll.mockResolvedValue(emptyTags);

      const emptyResponse = {
        description: 'Tag found',
        data: emptyTags,
        status: HttpStatus.OK,
      };
      mockResponseUtils.format.mockReturnValue(emptyResponse);

      const result = await controller.find();

      expect(mockTagsService.findAll).toHaveBeenCalledWith();
      expect(ResponseUtils.format).toHaveBeenCalledWith({
        description: 'Tag found',
        data: emptyTags,
        status: HttpStatus.OK,
      });
      expect(result).toEqual(emptyResponse);
    });

    it('should handle service errors', async () => {
      const error = new Error('Database error');
      mockTagsService.findAll.mockRejectedValue(error);

      await expect(controller.find()).rejects.toThrow('Database error');
      expect(mockTagsService.findAll).toHaveBeenCalledWith();
    });
  });

  describe('findById (GET /:id)', () => {
    const mockTag = { id: 1, name: 'Technology', is_active: true };
    const mockFormattedResponse = {
      description: 'Tag found',
      data: mockTag,
      status: HttpStatus.OK,
    };

    beforeEach(() => {
      mockTagsService.findOne.mockResolvedValue(mockTag);
      mockResponseUtils.format.mockReturnValue(mockFormattedResponse);
    });

    it('should return tag by id with formatted response', async () => {
      const tagId = '1';
      const result = await controller.findById(tagId);

      expect(mockTagsService.findOne).toHaveBeenCalledWith(1);
      expect(ResponseUtils.format).toHaveBeenCalledWith({
        description: 'Tag found',
        data: mockTag,
        status: HttpStatus.OK,
      });
      expect(result).toEqual(mockFormattedResponse);
    });

    it('should handle string id conversion', async () => {
      const tagId = '123';
      await controller.findById(tagId);

      expect(mockTagsService.findOne).toHaveBeenCalledWith(123);
    });

    it('should handle tag not found', async () => {
      mockTagsService.findOne.mockResolvedValue(null);

      const nullResponse = {
        description: 'Tag found',
        data: null,
        status: HttpStatus.OK,
      };
      mockResponseUtils.format.mockReturnValue(nullResponse);

      const result = await controller.findById('999');

      expect(mockTagsService.findOne).toHaveBeenCalledWith(999);
      expect(ResponseUtils.format).toHaveBeenCalledWith({
        description: 'Tag found',
        data: null,
        status: HttpStatus.OK,
      });
      expect(result).toEqual(nullResponse);
    });

    it('should handle invalid id format', async () => {
      // This test assumes the route regex \\d+ prevents non-numeric IDs
      // but we can still test the conversion
      const tagId = '0';
      await controller.findById(tagId);

      expect(mockTagsService.findOne).toHaveBeenCalledWith(0);
    });

    it('should handle service errors', async () => {
      const error = new Error('Database error');
      mockTagsService.findOne.mockRejectedValue(error);

      await expect(controller.findById('1')).rejects.toThrow('Database error');
      expect(mockTagsService.findOne).toHaveBeenCalledWith(1);
    });
  });

  describe('inheritance from BaseController', () => {
    it('should have access to inherited methods', () => {
      expect(typeof controller.find).toBe('function');
      expect(typeof controller.findById).toBe('function');
    });

    it('should have correct service and dataName properties', () => {
      expect(controller['service']).toBe(service);
      expect(controller['dataName']).toBe('Tag');
    });
  });

  describe('response formatting', () => {
    it('should use consistent response format for all endpoints', async () => {
      const mockData = { id: 1, name: 'Test Tag' };
      mockTagsService.findAll.mockResolvedValue([mockData]);
      mockTagsService.findOne.mockResolvedValue(mockData);

      // Test findAll response format
      await controller.find();
      expect(ResponseUtils.format).toHaveBeenCalledWith({
        description: 'Tag found',
        data: [mockData],
        status: HttpStatus.OK,
      });

      // Clear previous calls
      jest.clearAllMocks();
      mockResponseUtils.format.mockReturnValue({});

      // Test findById response format
      await controller.findById('1');
      expect(ResponseUtils.format).toHaveBeenCalledWith({
        description: 'Tag found',
        data: mockData,
        status: HttpStatus.OK,
      });
    });

    it('should maintain dataName consistency in responses', async () => {
      mockTagsService.findAll.mockResolvedValue([]);

      await controller.find();

      expect(ResponseUtils.format).toHaveBeenCalledWith(
        expect.objectContaining({
          description: expect.stringContaining('Tag'),
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
      mockTagsService.findAll.mockRejectedValue(serviceError);

      await expect(controller.find()).rejects.toThrow('Service specific error');
    });

    it('should propagate validation errors', async () => {
      const validationError = new Error('Validation failed');
      mockTagsService.findOne.mockRejectedValue(validationError);

      await expect(controller.findById('1')).rejects.toThrow(
        'Validation failed',
      );
    });
  });
});
