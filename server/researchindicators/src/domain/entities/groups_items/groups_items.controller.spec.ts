import { Test, TestingModule } from '@nestjs/testing';
import { GroupsItemsController } from './groups_items.controller';
import { GroupsItemsService } from './groups_items.service';
import { ResponseUtils } from '../../shared/utils/response.utils';
import { HttpStatus } from '@nestjs/common';
import { StructureDto } from './dto/group-item-action.dto';
import { ResultsUtil } from '../../shared/utils/results.util';

describe('GroupsItemsController', () => {
  let controller: GroupsItemsController;
  let service: GroupsItemsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [GroupsItemsController],
      providers: [
        {
          provide: GroupsItemsService,
          useValue: {
            findAll: jest.fn(),
            syncStructures2: jest.fn(),
          },
        },
        {
          provide: ResultsUtil,
          useValue: {
            transform: jest.fn((data) => data), // mock simple
          },
        },
      ],
    }).compile();

    controller = module.get<GroupsItemsController>(GroupsItemsController);
    service = module.get<GroupsItemsService>(GroupsItemsService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('findAll', () => {
    it('should return formatted response with structure', async () => {
      const agreementId = 'test-id';
      const mockResponse = {
        levels: [
          {
            custom_fields: [{ fieldID: 1, field_name: 'custom_field_1' }],
            id: 12,
            level: 1,
            name: 'Test Level 1',
          },
          {
            custom_fields: [{ fieldID: 2, field_name: 'custom_field_2' }],
            id: 13,
            level: 1,
            name: 'Test Level 2',
          },
        ],
        structures: [
          {
            id: 1,
            name: 'Test Structure',
          },
        ],
      };
      jest.spyOn(service, 'findAll').mockResolvedValue(mockResponse);
      const result = await controller.findAll(agreementId);
      expect(service.findAll).toHaveBeenCalledWith(agreementId);
      expect(result).toEqual(
        ResponseUtils.format({
          description: 'Structure found',
          status: HttpStatus.OK,
          data: mockResponse,
        }),
      );
    });

    it('should handle empty structures', async () => {
      const agreementId = 'test-id';
      const mockResponse = {
        levels: [
          {
            custom_fields: [{ fieldID: 1, field_name: 'custom_field_1' }],
            id: 12,
            level: 1,
            name: 'Test Level 1',
          },
          {
            custom_fields: [{ fieldID: 2, field_name: 'custom_field_2' }],
            id: 13,
            level: 1,
            name: 'Test Level 2',
          },
        ],
        structures: [],
      };

      jest.spyOn(service, 'findAll').mockResolvedValue(mockResponse);

      const result = await controller.findAll(agreementId);

      expect(service.findAll).toHaveBeenCalledWith(agreementId);
      expect(result.data.structures).toHaveLength(0);
    });
  });

  describe('handleAction', () => {
    it('should return formatted response after syncing structures', async () => {
      const dto: StructureDto = {
        agreement_id: 'test-agreement-id',
        levels: [
          {
            custom_fields: [{ fieldID: 1, field_name: 'custom_field_1' }],
            id: 12,
            level: 1,
            name: 'Test Level 1',
          },
          {
            custom_fields: [{ fieldID: 2, field_name: 'custom_field_2' }],
            id: 13,
            level: 1,
            name: 'Test Level 2',
          },
        ],
        structures: [
          {
            id: 1,
            name: 'Parent 1',
            code: 'P001',
            items: [
              {
                id: 2,
                name: 'Child 1',
                code: 'C001',
                indicators: [],
              },
            ],
          },
        ],
      };

      const mockServiceResponse = {
        message: 'Structures synchronized successfully',
        data: {
          parent: { id: 1, name: 'Parent Structure' },
          child: { id: 2, name: 'Child Structure' },
        },
      };

      jest
        .spyOn(service, 'syncStructures2')
        .mockResolvedValue(mockServiceResponse);

      const result = await controller.handleAction(dto);

      expect(service.syncStructures2).toHaveBeenCalledWith(dto);
      expect(result).toEqual(
        ResponseUtils.format({
          description: 'Structure found',
          status: HttpStatus.OK,
          data: mockServiceResponse,
        }),
      );
    });

    it('should handle sync without data', async () => {
      const dto: StructureDto = {
        agreement_id: 'test-agreement-id',
        levels: [
          {
            custom_fields: [{ fieldID: 1, field_name: 'custom_field_1' }],
            id: 12,
            level: 1,
            name: 'Test Level 1',
          },
          {
            custom_fields: [{ fieldID: 2, field_name: 'custom_field_2' }],
            id: 13,
            level: 1,
            name: 'Test Level 2',
          },
        ],
        structures: [],
      };

      const mockServiceResponse = {
        message: 'No structures to sync',
      };

      jest
        .spyOn(service, 'syncStructures2')
        .mockResolvedValue(mockServiceResponse);

      const result = await controller.handleAction(dto);

      expect(service.syncStructures2).toHaveBeenCalledWith(dto);
      expect(result.data.message).toBe('No structures to sync');
    });
  });
});
