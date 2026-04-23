import { Test, TestingModule } from '@nestjs/testing';
import { HttpStatus } from '@nestjs/common';
import { ClarisaInstitutionsController } from './clarisa-institutions.controller';
import { ClarisaInstitutionsService } from './clarisa-institutions.service';
import { ResponseUtils } from '../../../../shared/utils/response.utils';
import { TrueFalseEnum } from '../../../../shared/enum/queries.enum';

jest.mock('../../../../shared/utils/response.utils');

describe('ClarisaInstitutionsController', () => {
  let controller: ClarisaInstitutionsController;
  const mockService = {
    getInstitutionsByCountry: jest.fn(),
    findOne: jest.fn(),
  };
  const mockFormat = jest.fn();

  beforeEach(async () => {
    jest.clearAllMocks();
    (ResponseUtils.format as jest.Mock) = mockFormat;
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ClarisaInstitutionsController],
      providers: [
        { provide: ClarisaInstitutionsService, useValue: mockService },
      ],
    }).compile();
    controller = module.get(ClarisaInstitutionsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('findLocations delegates to getInstitutionsByCountry', async () => {
    mockService.getInstitutionsByCountry.mockResolvedValue([]);
    mockFormat.mockReturnValue({});
    await controller.findLocations(
      TrueFalseEnum.FALSE,
      TrueFalseEnum.FALSE,
      TrueFalseEnum.TRUE,
    );
    expect(mockService.getInstitutionsByCountry).toHaveBeenCalledWith(
      TrueFalseEnum.TRUE,
      TrueFalseEnum.FALSE,
      TrueFalseEnum.FALSE,
    );
  });

  it('findById', async () => {
    mockService.findOne.mockResolvedValue({ id: 9 });
    mockFormat.mockReturnValue({});
    await controller.findById('9');
    expect(mockService.findOne).toHaveBeenCalledWith(9);
    expect(ResponseUtils.format).toHaveBeenCalledWith({
      description: 'Institution found',
      data: { id: 9 },
      status: HttpStatus.OK,
    });
  });
});
