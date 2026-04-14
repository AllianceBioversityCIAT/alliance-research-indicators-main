import { HttpStatus } from '@nestjs/common';
import { ResponseUtils, customErrorResponse } from './response.utils';
import { ServiceResponseDto } from '../global-dto/service-response.dto';

describe('response.utils', () => {
  describe('ResponseUtils.format', () => {
    it('should pass through response fields', () => {
      const res: ServiceResponseDto<{ id: number }> = {
        description: 'ok',
        status: HttpStatus.OK,
        data: { id: 1 },
        errors: null,
      };
      expect(ResponseUtils.format(res)).toEqual(res);
    });
  });

  describe('customErrorResponse', () => {
    it('should map error dto', () => {
      expect(
        customErrorResponse({
          message: 'm',
          status: HttpStatus.BAD_REQUEST,
          name: 'Bad',
        }),
      ).toEqual({
        message: 'm',
        status: HttpStatus.BAD_REQUEST,
        name: 'Bad',
      });
    });
  });
});
