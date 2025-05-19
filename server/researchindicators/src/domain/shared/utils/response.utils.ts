import {
  ServiceResponseDto,
  ServiceResponseErrorDto,
} from '../global-dto/service-response.dto';

export class ResponseUtils {
  static format<T>(res: ServiceResponseDto<T>): ServiceResponseDto<T> {
    return {
      description: res.description,
      status: res.status,
      data: res?.data,
      errors: res?.errors,
    };
  }
}

/**
 * ⚠️ Only use this function for very specific cases regarding custom error formatting.
 * In general, prefer throwing NestJS built-in HTTP exceptions (e.g., BadRequestException, NotFoundException, etc.)
 * to ensure consistent error handling and integration with global filters and interceptors.
 *
 * @param res - An object containing error metadata to be returned in the response.
 * @description This function is used to manually format error responses when needed.
 * @template T - The type of the data contained in the error response (if any).
 * @returns A formatted error response matching the ServiceResponseErrorDto structure.
 */
export const customErrorResponse = <T>(
  res: ServiceResponseErrorDto<T>,
): ServiceResponseErrorDto<T> => ({
  message: res.message,
  status: res.status,
  name: res.name,
});
