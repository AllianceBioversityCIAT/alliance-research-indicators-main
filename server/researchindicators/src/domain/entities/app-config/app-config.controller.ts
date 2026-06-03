import {
  Body,
  Controller,
  DefaultValuePipe,
  Get,
  HttpStatus,
  Param,
  Patch,
  Query,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { AppConfigService } from './app-config.service';
import { ResponseUtils } from '../../shared/utils/response.utils';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { RolesGuard } from '../../shared/guards/roles.guard';
import { Roles } from '../../shared/decorators/roles.decorator';
import { SecRolesEnum } from '../../shared/enum/sec_role.enum';
import { UpdateAppConfigDto } from './dtos/update-app-config.dto';
import { AppConfigSorting } from './enum/app-config-forting.enum';

@ApiTags('Configuration')
@ApiBearerAuth()
@Controller()
@UseGuards(RolesGuard)
export class AppConfigController {
  constructor(private readonly appConfigService: AppConfigService) {}

  @Get()
  @ApiOperation({ summary: 'List application configuration entries' })
  @ApiQuery({
    name: 'search',
    required: false,
    type: String,
    description: 'Text search across key, category, values, and updater name',
  })
  @ApiQuery({
    name: 'category',
    required: false,
    type: String,
    description: 'Filter by configuration category',
  })
  @ApiQuery({
    name: 'subcategory',
    required: false,
    type: String,
    description: 'Filter by configuration subcategory',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Page number (1-based)',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Maximum number of items per page',
  })
  @ApiQuery({
    name: 'sort-field',
    required: false,
    enum: AppConfigSorting,
    description:
      'Field used for secondary sort (primary sort is relevance when search is set)',
  })
  @ApiQuery({
    name: 'sort-order',
    required: false,
    enum: ['ASC', 'DESC'],
    description: 'Sort direction for sort-field',
  })
  async getAllConfigs(
    @Query('search') search?: string,
    @Query('category') category?: string,
    @Query('subcategory') subcategory?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('sort-field', new DefaultValuePipe(AppConfigSorting.KEY))
    sortField?: AppConfigSorting,
    @Query('sort-order', new DefaultValuePipe('ASC'))
    sortOrder?: 'ASC' | 'DESC',
  ) {
    const pageNumber = page ? Number(page) : undefined;
    const limitNumber = limit ? Number(limit) : undefined;

    return this.appConfigService
      .getAllConfigs(
        { category, subcategory },
        { field: sortField, order: sortOrder },
        { page: pageNumber, limit: limitNumber },
        search,
      )
      .then((data) =>
        ResponseUtils.format({
          data,
          description: 'Configurations retrieved successfully',
          status: HttpStatus.OK,
        }),
      );
  }

  @Get('categories-and-subcategories')
  @ApiOperation({ summary: 'Get all categories and subcategories' })
  async getCategoriesAndSubcategories() {
    return this.appConfigService.getCategoriesAndSubcategories().then((data) =>
      ResponseUtils.format({
        data,
        description: 'Categories and subcategories retrieved successfully',
        status: HttpStatus.OK,
      }),
    );
  }

  @Get(':key')
  @ApiOperation({ summary: 'Get a configuration entry by key' })
  @ApiParam({
    name: 'key',
    description: 'The key of the configuration to retrieve',
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
    type: UpdateAppConfigDto,
    description: 'Configuration data to update',
  })
  @ApiParam({
    name: 'key',
    description: 'The key of the configuration to update',
    type: String,
  })
  @Roles(SecRolesEnum.TECHNICAL_SUPPORT, SecRolesEnum.SYSTEM_ADMIN)
  @UsePipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  )
  async updateConfig(
    @Param('key') key: string,
    @Body() updateData: Partial<UpdateAppConfigDto>,
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
