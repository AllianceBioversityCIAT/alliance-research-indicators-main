import { Test, TestingModule } from '@nestjs/testing';
import { HttpStatus } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ResponseUtils } from './domain/shared/utils/response.utils';

jest.mock('./domain/shared/utils/response.utils');

describe('AppController', () => {
  let controller: AppController;
  const mockFormat = jest.fn();

  beforeEach(async () => {
    jest.clearAllMocks();
    (ResponseUtils.format as jest.Mock) = mockFormat;
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [{ provide: AppService, useValue: {} }],
    }).compile();
    controller = module.get(AppController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('mainPage formats welcome payload', () => {
    const req = {
      ip: '127.0.0.1',
      headers: { 'user-agent': 'jest' },
    } as any;
    mockFormat.mockReturnValue({ ok: true });
    const out = controller.mainPage(req);
    expect(ResponseUtils.format).toHaveBeenCalledWith({
      description: 'Aliance',
      status: HttpStatus.OK,
      data: {
        message: 'Welcome to the Aliance API',
        author: 'One CGIAR - IBD',
        ip: '127.0.0.1',
        client: 'jest',
      },
    });
    expect(out).toEqual({ ok: true });
  });
});
