import { Test, TestingModule } from '@nestjs/testing';
import { HttpStatus } from '@nestjs/common';
import { AllianceUserStaffController } from './alliance-user-staff.controller';
import { AllianceUserStaffService } from './alliance-user-staff.service';
import { ResponseUtils } from '../../shared/utils/response.utils';

jest.mock('../../shared/utils/response.utils');

describe('AllianceUserStaffController', () => {
  let controller: AllianceUserStaffController;
  const mockService = {
    findBySearch: jest.fn(),
    findWithFilters: jest.fn(),
    findOne: jest.fn(),
  };
  const mockFormat = jest.fn();

  beforeEach(async () => {
    jest.clearAllMocks();
    (ResponseUtils.format as jest.Mock) = mockFormat;
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AllianceUserStaffController],
      providers: [
        { provide: AllianceUserStaffService, useValue: mockService },
      ],
    }).compile();
    controller = module.get(AllianceUserStaffController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('find', async () => {
    const rows = [];
    mockService.findBySearch.mockResolvedValue(rows);
    mockFormat.mockReturnValue({});
    await controller.find('alice');
    expect(mockService.findBySearch).toHaveBeenCalledWith('alice');
    expect(ResponseUtils.format).toHaveBeenCalledWith({
      description: 'Alliance user staff found',
      status: HttpStatus.OK,
      data: rows,
    });
  });

  it('findWithFilters', async () => {
    const page = { items: [] };
    mockService.findWithFilters.mockResolvedValue(page);
    mockFormat.mockReturnValue({});
    await controller.findWithFilters('Bob', '2', '20');
    expect(mockService.findWithFilters).toHaveBeenCalledWith(
      { limit: 20, page: 2 },
      'Bob',
    );
  });

  it('findOne', async () => {
    const one = { id: '1' };
    mockService.findOne.mockResolvedValue(one);
    mockFormat.mockReturnValue({});
    await controller.findOne('1');
    expect(mockService.findOne).toHaveBeenCalledWith('1');
  });
});
