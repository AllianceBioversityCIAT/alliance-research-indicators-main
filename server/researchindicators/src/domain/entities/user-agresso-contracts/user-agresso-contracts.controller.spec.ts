import { Test, TestingModule } from '@nestjs/testing';
import { HttpStatus } from '@nestjs/common';
import { UserAgressoContractsController } from './user-agresso-contracts.controller';
import { UserAgressoContractsService } from './user-agresso-contracts.service';
import { ResponseUtils } from '../../shared/utils/response.utils';
import { ResultStatusGuard } from '../../shared/guards/result-status.guard';

jest.mock('../../shared/utils/response.utils');

describe('UserAgressoContractsController', () => {
  let controller: UserAgressoContractsController;
  const mockService = {
    linkUserToContract: jest.fn(),
    automaticLinkUserAgressoContract: jest.fn(),
  };
  const mockFormat = jest.fn();

  beforeEach(async () => {
    jest.clearAllMocks();
    (ResponseUtils.format as jest.Mock) = mockFormat;
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UserAgressoContractsController],
      providers: [
        { provide: UserAgressoContractsService, useValue: mockService },
      ],
    })
      .overrideGuard(ResultStatusGuard)
      .useValue({ canActivate: () => true })
      .compile();
    controller = module.get(UserAgressoContractsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('linkUserToContract', async () => {
    const row = { id: 1 } as any;
    mockService.linkUserToContract.mockResolvedValue(row);
    mockFormat.mockReturnValue({});
    await controller.linkUserToContract('7', 'AGR-1');
    expect(mockService.linkUserToContract).toHaveBeenCalledWith(7, 'AGR-1');
    expect(ResponseUtils.format).toHaveBeenCalledWith({
      description: 'User linked to contract',
      status: HttpStatus.OK,
      data: row,
    });
  });

  it('automaticLinkUserAgressoContract', async () => {
    const user = { sec_user_id: 1 } as any;
    const rows = [];
    mockService.automaticLinkUserAgressoContract.mockResolvedValue(rows);
    mockFormat.mockReturnValue({});
    await controller.automaticLinkUserAgressoContract(user);
    expect(mockService.automaticLinkUserAgressoContract).toHaveBeenCalledWith(
      user,
    );
    expect(ResponseUtils.format).toHaveBeenCalledWith({
      description: 'User linked to contract',
      status: HttpStatus.OK,
      data: rows,
    });
  });

  it('socket_automaticLinkUserAgressoContract', async () => {
    const user = { sec_user_id: 2 } as any;
    const rows = [];
    mockService.automaticLinkUserAgressoContract.mockResolvedValue(rows);
    mockFormat.mockReturnValue({});
    await controller.socket_automaticLinkUserAgressoContract(user);
    expect(mockService.automaticLinkUserAgressoContract).toHaveBeenCalledWith(
      user,
    );
  });
});
