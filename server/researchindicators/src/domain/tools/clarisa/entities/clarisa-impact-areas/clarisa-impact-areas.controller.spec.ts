import { Test, TestingModule } from '@nestjs/testing';
import { HttpStatus } from '@nestjs/common';
import { ClarisaImpactAreasController } from './clarisa-impact-areas.controller';
import { ClarisaImpactAreasService } from './clarisa-impact-areas.service';
import { ResponseUtils } from '../../../../shared/utils/response.utils';

jest.mock('../../../../shared/utils/response.utils');

describe('ClarisaImpactAreasController', () => {
  let controller: ClarisaImpactAreasController;
  const mockService = { findAll: jest.fn(), findOne: jest.fn() };
  const mockFormat = jest.fn();

  beforeEach(async () => {
    jest.clearAllMocks();
    (ResponseUtils.format as jest.Mock) = mockFormat;
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ClarisaImpactAreasController],
      providers: [
        { provide: ClarisaImpactAreasService, useValue: mockService },
      ],
    }).compile();
    controller = module.get(ClarisaImpactAreasController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('find uses Impact Area label', async () => {
    mockService.findAll.mockResolvedValue([]);
    mockFormat.mockReturnValue({});
    await controller.find();
    expect(ResponseUtils.format).toHaveBeenCalledWith({
      description: 'Impact Area found',
      data: [],
      status: HttpStatus.OK,
    });
  });
});
