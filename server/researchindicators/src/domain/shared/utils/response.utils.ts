import { ServiceResponseDto } from '../global-dto/service-response.dto';

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
