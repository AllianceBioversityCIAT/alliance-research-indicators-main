import { ServiceResponseDto } from './service-response.dto';

export class ServerResponseDto<T> extends ServiceResponseDto<T> {
  timestamp: string;
  path: string;
}
