import { Injectable } from '@nestjs/common';
import { BaseApi } from '../core/base-api';
import { HttpService } from '@nestjs/axios';
import { AppConfig } from '../../shared/utils/app-config.util';
import { firstValueFrom } from 'rxjs';
import { ValidJwtResponse } from '../../shared/global-dto/management-response.dto';

@Injectable()
export class RoarManagementService extends BaseApi {
  constructor(http: HttpService, appConfig: AppConfig) {
    super(http, appConfig.ROAR_MANAGEMENT_HOST, RoarManagementService.name);
  }

  async validateToken(token: string): Promise<ValidJwtResponse> {
    return firstValueFrom(
      this.patchRequest('api/authorization/validate-token', undefined, {
        headers: {
          'access-token': token,
        },
      }),
    ).then((response: any) => response.data.data as ValidJwtResponse);
  }
}
