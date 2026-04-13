import { Test, TestingModule } from '@nestjs/testing';
import { HttpStatus } from '@nestjs/common';
import { ClarisaLanguagesController } from './clarisa-languages.controller';
import { ClarisaLanguagesService } from './clarisa-languages.service';
import { ResponseUtils } from '../../../../shared/utils/response.utils';

jest.mock('../../../../shared/utils/response.utils');

describe('ClarisaLanguagesController', () => {
  let controller: ClarisaLanguagesController;
  const mockService = { findAll: jest.fn(), findOne: jest.fn() };
  const mockFormat = jest.fn();

  beforeEach(async () => {
    jest.clearAllMocks();
    (ResponseUtils.format as jest.Mock) = mockFormat;
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ClarisaLanguagesController],
      providers: [{ provide: ClarisaLanguagesService, useValue: mockService }],
    }).compile();
    controller = module.get(ClarisaLanguagesController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('find', async () => {
    mockService.findAll.mockResolvedValue([]);
    mockFormat.mockReturnValue({});
    await controller.find();
    expect(ResponseUtils.format).toHaveBeenCalledWith({
      description: 'Languages found',
      data: [],
      status: HttpStatus.OK,
    });
  });

  it('findById', async () => {
    mockService.findOne.mockResolvedValue({});
    mockFormat.mockReturnValue({});
    await controller.findById('1');
    expect(mockService.findOne).toHaveBeenCalledWith(1);
  });
});
