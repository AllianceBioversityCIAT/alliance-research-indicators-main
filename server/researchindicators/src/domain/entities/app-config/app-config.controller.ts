import {
  Body,
  Controller,
  Get,
  HttpStatus,
  Param,
  Patch,
  UseGuards,
} from '@nestjs/common';
import { AppConfigService } from './app-config.service';
import { ResponseUtils } from '../../shared/utils/response.utils';
import { AppConfig } from './entities/app-config.entity';
import { ApiBearerAuth, ApiBody, ApiParam, ApiTags } from '@nestjs/swagger';
import { RolesGuard } from '../../shared/guards/roles.guard';
import { Roles } from '../../shared/decorators/roles.decorator';
import { SecRolesEnum } from '../../shared/enum/sec_role.enum';

@ApiTags('Configuration')
@ApiBearerAuth()
@Controller()
@UseGuards(RolesGuard)
export class AppConfigController {
  constructor(private readonly appConfigService: AppConfigService) {}

  @Get(':key')
  @ApiParam({
    name: 'key',
    description: 'The key of the configuration to update',
    type: String,
  })
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
  @ApiBody({
    type: AppConfig,
    description: 'Configuration data to update',
  })
  @ApiParam({
    name: 'key',
    description: 'The key of the configuration to update',
    type: String,
  })
  @Roles(SecRolesEnum.DEVELOPER)
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
