import { Test, TestingModule } from '@nestjs/testing';
import { HttpStatus } from '@nestjs/common';
import { AgressoStaffToolsController } from './agresso-staff-tools.controller';
import { AgressoStaffToolsService } from './agresso-staff-tools.service';
import { ResponseUtils } from '../../../shared/utils/response.utils';

jest.mock('../../../shared/utils/response.utils');

describe('AgressoStaffToolsController', () => {
  let controller: AgressoStaffToolsController;
  const mockService = { cloneAllAgressoStaff: jest.fn() };
  const mockFormat = jest.fn();

  beforeEach(async () => {
    jest.clearAllMocks();
    (ResponseUtils.format as jest.Mock) = mockFormat;
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AgressoStaffToolsController],
      providers: [
        { provide: AgressoStaffToolsService, useValue: mockService },
      ],
    }).compile();
    controller = module.get(AgressoStaffToolsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('runCloneClarisa', () => {
    mockFormat.mockReturnValue({});
    controller.runCloneClarisa();
    expect(mockService.cloneAllAgressoStaff).toHaveBeenCalled();
    expect(ResponseUtils.format).toHaveBeenCalledWith({
      description: 'The clone process has been started',
      status: HttpStatus.OK,
    });
  });
});
