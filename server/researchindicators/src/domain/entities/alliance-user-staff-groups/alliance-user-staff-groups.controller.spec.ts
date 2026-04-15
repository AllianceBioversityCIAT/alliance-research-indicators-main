import { Test, TestingModule } from '@nestjs/testing';
import { HttpStatus } from '@nestjs/common';
import { AllianceUserStaffGroupsController } from './alliance-user-staff-groups.controller';
import { AllianceUserStaffGroupsService } from './alliance-user-staff-groups.service';
import { ResponseUtils } from '../../shared/utils/response.utils';

jest.mock('../../shared/utils/response.utils');

describe('AllianceUserStaffGroupsController', () => {
  let controller: AllianceUserStaffGroupsController;
  const mockService = {
    findAll: jest.fn(),
    findOne: jest.fn(),
    findAllMap: jest.fn(),
  };
  const mockFormat = jest.fn();

  beforeEach(async () => {
    jest.clearAllMocks();
    (ResponseUtils.format as jest.Mock) = mockFormat;
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AllianceUserStaffGroupsController],
      providers: [
        { provide: AllianceUserStaffGroupsService, useValue: mockService },
      ],
    }).compile();
    controller = module.get(AllianceUserStaffGroupsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('findAllMap', () => {
    it('should call findAllMap without group when groupId empty', async () => {
      const map = { a: 1 };
      mockService.findAllMap.mockResolvedValue(map);
      mockFormat.mockReturnValue({ map });
      await controller.findAllMap(undefined);
      expect(mockService.findAllMap).toHaveBeenCalledWith(undefined);
      expect(ResponseUtils.format).toHaveBeenCalledWith({
        data: map,
        description: 'Alliance User Staff Groups mapped by Alliance User Staff',
        status: HttpStatus.OK,
      });
    });

    it('should pass numeric groupId', async () => {
      mockService.findAllMap.mockResolvedValue({});
      mockFormat.mockReturnValue({});
      await controller.findAllMap(2);
      expect(mockService.findAllMap).toHaveBeenCalledWith(2);
    });
  });
});
