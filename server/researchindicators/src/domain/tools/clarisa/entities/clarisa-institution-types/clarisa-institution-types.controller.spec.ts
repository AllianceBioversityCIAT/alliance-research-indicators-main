import { Test, TestingModule } from '@nestjs/testing';
import { HttpStatus } from '@nestjs/common';
import { ClarisaInstitutionTypesController } from './clarisa-institution-types.controller';
import { ClarisaInstitutionTypesService } from './clarisa-institution-types.service';
import { ResponseUtils } from '../../../../shared/utils/response.utils';

jest.mock('../../../../shared/utils/response.utils');

describe('ClarisaInstitutionTypesController', () => {
  let controller: ClarisaInstitutionTypesController;
  const mockService = {
    findAll: jest.fn(),
    findOne: jest.fn(),
    findInstitutionTypeToPartner: jest.fn(),
    getChildlessInstitutionTypes: jest.fn(),
    getInstitutionTypesByDepthLevel: jest.fn(),
  };
  const mockFormat = jest.fn();

  beforeEach(async () => {
    jest.clearAllMocks();
    (ResponseUtils.format as jest.Mock) = mockFormat;
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ClarisaInstitutionTypesController],
      providers: [
        { provide: ClarisaInstitutionTypesService, useValue: mockService },
      ],
    }).compile();
    controller = module.get(ClarisaInstitutionTypesController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('find', async () => {
    mockService.findAll.mockResolvedValue([]);
    mockFormat.mockReturnValue({});
    await controller.find();
    expect(ResponseUtils.format).toHaveBeenCalledWith({
      data: [],
      description: 'Institution types found',
      status: HttpStatus.OK,
    });
  });

  it('findById', async () => {
    mockService.findOne.mockResolvedValue({ id: 1 });
    mockFormat.mockReturnValue({});
    await controller.findById('1');
    expect(mockService.findOne).toHaveBeenCalledWith(1);
  });

  it('findInstitutionTypeToPartner', async () => {
    mockService.findInstitutionTypeToPartner.mockResolvedValue([]);
    mockFormat.mockReturnValue({});
    await controller.findInstitutionTypeToPartner();
    expect(mockService.findInstitutionTypeToPartner).toHaveBeenCalled();
  });

  it('getChildlessInstitutionTypes', async () => {
    mockService.getChildlessInstitutionTypes.mockResolvedValue([]);
    mockFormat.mockReturnValue({});
    await controller.getChildlessInstitutionTypes();
    expect(mockService.getChildlessInstitutionTypes).toHaveBeenCalled();
  });

  it('getInstitutionTypesByDepthLevel', async () => {
    mockService.getInstitutionTypesByDepthLevel.mockResolvedValue([]);
    mockFormat.mockReturnValue({});
    await controller.getInstitutionTypesByDepthLevel('2', '10');
    expect(mockService.getInstitutionTypesByDepthLevel).toHaveBeenCalledWith(
      10,
      2,
    );
  });
});
