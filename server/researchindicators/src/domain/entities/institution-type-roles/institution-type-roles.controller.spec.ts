import { Test, TestingModule } from '@nestjs/testing';
import { HttpStatus } from '@nestjs/common';
import { InstitutionTypeRolesController } from './institution-type-roles.controller';
import { InstitutionTypeRolesService } from './institution-type-roles.service';
import { ResponseUtils } from '../../shared/utils/response.utils';

jest.mock('../../shared/utils/response.utils');

describe('InstitutionTypeRolesController', () => {
  let controller: InstitutionTypeRolesController;
  const mockService = { findAll: jest.fn(), findOne: jest.fn() };
  const mockFormat = jest.fn();

  beforeEach(async () => {
    jest.clearAllMocks();
    (ResponseUtils.format as jest.Mock) = mockFormat;
    const module: TestingModule = await Test.createTestingModule({
      controllers: [InstitutionTypeRolesController],
      providers: [
        { provide: InstitutionTypeRolesService, useValue: mockService },
      ],
    }).compile();
    controller = module.get(InstitutionTypeRolesController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('find uses Institution type roles label', async () => {
    mockService.findAll.mockResolvedValue([]);
    mockFormat.mockReturnValue({});
    await controller.find();
    expect(ResponseUtils.format).toHaveBeenCalledWith({
      description: 'Institution type roles found',
      data: [],
      status: HttpStatus.OK,
    });
  });
});
