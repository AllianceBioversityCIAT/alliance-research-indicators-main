import { Test, TestingModule } from '@nestjs/testing';
import { HttpStatus } from '@nestjs/common';
import { NotableReferenceTypesController } from './notable-reference-types.controller';
import { NotableReferenceTypesService } from './notable-reference-types.service';
import { ResponseUtils } from '../../shared/utils/response.utils';

jest.mock('../../shared/utils/response.utils');

describe('NotableReferenceTypesController', () => {
  let controller: NotableReferenceTypesController;
  const mockService = { findAll: jest.fn(), findOne: jest.fn() };
  const mockFormat = jest.fn();

  beforeEach(async () => {
    jest.clearAllMocks();
    (ResponseUtils.format as jest.Mock) = mockFormat;
    const module: TestingModule = await Test.createTestingModule({
      controllers: [NotableReferenceTypesController],
      providers: [
        { provide: NotableReferenceTypesService, useValue: mockService },
      ],
    }).compile();
    controller = module.get(NotableReferenceTypesController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('find should format list', async () => {
    const data = [{ id: 1 }];
    mockService.findAll.mockResolvedValue(data);
    mockFormat.mockReturnValue({ data });
    await controller.find();
    expect(ResponseUtils.format).toHaveBeenCalledWith({
      description: 'NotableReferenceType found',
      data,
      status: HttpStatus.OK,
    });
  });

  it('findById should format one', async () => {
    mockService.findOne.mockResolvedValue({ id: 2 });
    mockFormat.mockReturnValue({});
    await controller.findById('2');
    expect(mockService.findOne).toHaveBeenCalledWith(2);
  });
});
