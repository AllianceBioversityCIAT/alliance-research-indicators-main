import {
  Body,
  Controller,
  Get,
  HttpStatus,
  Param,
  Patch,
} from '@nestjs/common';
import { AppConfigService } from './app-config.service';
import { ResponseUtils } from '../../shared/utils/response.utils';
import { AppConfig } from './entities/app-config.entity';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

@ApiTags('Configuration')
@ApiBearerAuth()
@Controller()
export class AppConfigController {
  constructor(private readonly appConfigService: AppConfigService) {}

  @Get(':key')
  async getConfigByKey(@Param('key') key: string) {
    return this.appConfigService.findConfigByKey(key).then((config) =>
      ResponseUtils.format({
        data: config,
        description: 'Configuration retrieved successfully',
        status: HttpStatus.OK,
      }),
    );
  }

  @Patch(':key')
  async updateConfig(
    @Param('key') key: string,
    @Body() updateData: Partial<AppConfig>,
  ) {
    return this.appConfigService.updateConfig(key, updateData).then((config) =>
      ResponseUtils.format({
        data: config,
        description: 'Configuration updated successfully',
        status: HttpStatus.OK,
      }),
    );
  }
}
