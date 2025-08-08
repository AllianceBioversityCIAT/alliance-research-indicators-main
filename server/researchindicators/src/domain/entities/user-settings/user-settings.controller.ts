import {
  Body,
  Controller,
  Get,
  HttpStatus,
  Param,
  Patch,
  Query,
} from '@nestjs/common';
import { UserSettingsService } from './user-settings.service';
import {
  ApiBearerAuth,
  ApiBody,
  ApiParam,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { ResponseUtils } from '../../shared/utils/response.utils';

@ApiTags('User Settings')
@ApiBearerAuth()
@Controller()
export class UserSettingsController {
  constructor(private readonly userSettingsService: UserSettingsService) {}

  @ApiQuery({
    name: 'component',
    required: false,
    description: 'The component for which to retrieve user settings',
  })
  @ApiParam({
    name: 'key',
    required: true,
    description: 'The key of the user setting to retrieve',
  })
  @Get(':key')
  async findByUserIdAndComponent(
    @Param('key') key: string,
    @Query('component') component: string,
  ) {
    return this.userSettingsService
      .findByUserIdAndComponent(key, component)
      .then((res) =>
        ResponseUtils.format({
          description: 'User settings retrieved successfully',
          data: res,
          status: HttpStatus.OK,
        }),
      );
  }

  @ApiQuery({
    name: 'component',
    required: true,
    description: 'The component for which to retrieve user settings',
  })
  @ApiParam({
    name: 'key',
    required: true,
    description: 'The key of the user setting to retrieve',
  })
  @ApiBody({
    description: 'Data to update user settings',
    type: Object,
  })
  @Patch(':key')
  async updateUserSettings(
    @Param('key') key: string,
    @Query('component') component: string,
    @Body() data: Record<string, string>,
  ) {
    return this.userSettingsService
      .updateSettings(key, component, data)
      .then((res) =>
        ResponseUtils.format({
          description: 'User settings updated successfully',
          data: res,
          status: HttpStatus.OK,
        }),
      );
  }
}
