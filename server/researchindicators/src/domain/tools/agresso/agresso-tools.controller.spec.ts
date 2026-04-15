import { Test, TestingModule } from '@nestjs/testing';
import { HttpStatus } from '@nestjs/common';
import { AgressoToolsController } from './agresso-tools.controller';
import { AgressoToolsService } from './agresso-tools.service';
import { ResponseUtils } from '../../shared/utils/response.utils';

jest.mock('../../shared/utils/response.utils');

describe('AgressoToolsController', () => {
  let controller: AgressoToolsController;
  const mockService = { cloneAllAgressoEntities: jest.fn() };
  const mockFormat = jest.fn();

  beforeEach(async () => {
    jest.clearAllMocks();
    (ResponseUtils.format as jest.Mock) = mockFormat;
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AgressoToolsController],
      providers: [{ provide: AgressoToolsService, useValue: mockService }],
    }).compile();
    controller = module.get(AgressoToolsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('runCloneClarisa triggers clone and returns format', () => {
    mockFormat.mockReturnValue({ started: true });
    const out = controller.runCloneClarisa();
    expect(mockService.cloneAllAgressoEntities).toHaveBeenCalled();
    expect(ResponseUtils.format).toHaveBeenCalledWith({
      description: 'The clone process has been started',
      status: HttpStatus.OK,
    });
    expect(out).toEqual({ started: true });
  });
});
