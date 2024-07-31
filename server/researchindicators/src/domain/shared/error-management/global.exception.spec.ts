import { Test } from '@nestjs/testing';
import { GlobalExceptions } from './global.exception';
import {
  ArgumentsHost,
  HttpStatus,
  InternalServerErrorException,
} from '@nestjs/common';
import { SlackService } from '../../tools/slack/slack.service';

describe('GlobalExceptions', () => {
  let filter: GlobalExceptions;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [GlobalExceptions, SlackService],
    }).compile();

    filter = module.get<GlobalExceptions>(GlobalExceptions);
  });

  it('should handle an exception and return the correct response', () => {
    const exception = new InternalServerErrorException('Test error');
    const mockJson = jest.fn();
    const mockStatus = jest.fn().mockReturnValue({ json: mockJson });
    const mockGetResponse = jest.fn().mockReturnValue({ status: mockStatus });
    const mockGetRequest = jest.fn().mockReturnValue({ url: '/test' });
    const mockArgumentsHost: Partial<ArgumentsHost> = {
      switchToHttp: jest.fn().mockReturnValue({
        getResponse: mockGetResponse,
        getRequest: mockGetRequest,
      }),
    };

    filter.catch(exception, mockArgumentsHost as ArgumentsHost);

    expect(mockArgumentsHost.switchToHttp).toHaveBeenCalled();
    expect(mockGetResponse).toHaveBeenCalled();
    expect(mockGetRequest).toHaveBeenCalled();
    expect(mockStatus).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
    expect(mockJson).toHaveBeenCalledWith(
      expect.objectContaining({
        description: exception.name,
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        errors: exception.message,
        path: '/test',
      }),
    );
  });
});
