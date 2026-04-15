import { Test, TestingModule } from '@nestjs/testing';
import { HttpStatus } from '@nestjs/common';
import { ConnectionController } from './connections.controller';
import { ConnectionService } from './connections.service';
import { ResponseUtils } from '../../shared/utils/response.utils';

jest.mock('../../shared/utils/response.utils');

describe('ConnectionController', () => {
  let controller: ConnectionController;
  const mockService = { createConnection: jest.fn() };
  const mockFormat = jest.fn();

  beforeEach(async () => {
    jest.clearAllMocks();
    (ResponseUtils.format as jest.Mock) = mockFormat;
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ConnectionController],
      providers: [{ provide: ConnectionService, useValue: mockService }],
    }).compile();
    controller = module.get(ConnectionController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('createConnection', async () => {
    const body = { name: 'x' } as any;
    const res = { id: 1 };
    mockService.createConnection.mockResolvedValue(res);
    mockFormat.mockReturnValue({ ok: true });
    await controller.createConnection(body);
    expect(mockService.createConnection).toHaveBeenCalledWith(body);
    expect(ResponseUtils.format).toHaveBeenCalledWith({
      description: 'Connection created',
      data: res,
      status: HttpStatus.OK,
    });
  });
});
