import {
  Body,
  Controller,
  Delete,
  Get,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
  UseInterceptors,
  ValidationPipe,
  UsePipes,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { ControlListsService } from './control-lists.service';
import { CreateControlListCategoryDto } from './dto/create-control-list-category.dto';
import { UpdateControlListCategoryDto } from './dto/update-control-list-category.dto';
import { GetCategoriesQueryDto } from './dto/get-categories-query.dto';
import { CreateControlListDto } from './dto/create-control-list.dto';
import { UpdateControlListDto } from './dto/update-control-list.dto';
import { CreateControlListValueDto } from './dto/create-control-list-value.dto';
import { UpdateControlListValueDto } from './dto/update-control-list-value.dto';
import { GetListValuesByKeyQueryDto } from './dto/get-list-values-by-key-query.dto';
import { RolesGuard } from '../../shared/guards/roles.guard';
import { SetUpInterceptor } from '../../shared/Interceptors/setup.interceptor';
import { ResponseUtils } from '../../shared/utils/response.utils';
import { Roles } from '../../shared/decorators/roles.decorator';
import { SecRolesEnum } from '../../shared/enum/sec_role.enum';

// System-admin module (global-scope change, design.md §8, R-CLG-008,
// D-CLG-8): every admin handler here (A1, A3-A12) is SYSTEM_ADMIN /
// TECHNICAL_SUPPORT — the same pair as app-config.controller.ts.
// CENTER_ADMIN is no longer granted (it supersedes D-CTL-7). The one
// exception is A13 (getValuesByKey): the consumer read, open to any
// authenticated user — it deliberately has NO @Roles decorator.
@Controller()
@ApiTags('Control Lists')
@ApiBearerAuth()
@UseInterceptors(SetUpInterceptor)
@UseGuards(RolesGuard)
export class ControlListsController {
  constructor(private readonly controlListsService: ControlListsService) {}

  // A1 — no parameters (R-CLG-001). The empty query DTO stays bound so the
  // ValidationPipe rejects a stale caller's extra parameter with a 400
  // (D-CLG-3).
  @Get('categories')
  @ApiOperation({ summary: 'List all categories with their lists' })
  @Roles(SecRolesEnum.SYSTEM_ADMIN, SecRolesEnum.TECHNICAL_SUPPORT)
  @UsePipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  )
  async getCategories(@Query() _query: GetCategoriesQueryDto) {
    return this.controlListsService.getCategories().then((data) =>
      ResponseUtils.format({
        description: 'Categories found',
        data,
        status: HttpStatus.OK,
      }),
    );
  }

  // A3
  @Post('categories')
  @ApiOperation({ summary: 'Create a category' })
  @ApiBody({
    type: CreateControlListCategoryDto,
    description: 'Create a category',
  })
  @Roles(SecRolesEnum.SYSTEM_ADMIN, SecRolesEnum.TECHNICAL_SUPPORT)
  @UsePipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  )
  async createCategory(@Body() dto: CreateControlListCategoryDto) {
    return this.controlListsService.createCategory(dto).then((data) =>
      ResponseUtils.format({
        description: 'Category created successfully',
        data,
        status: HttpStatus.CREATED,
      }),
    );
  }

  // A4
  @Patch('categories/:id')
  @ApiOperation({ summary: 'Update a category' })
  @ApiParam({
    name: 'id',
    type: Number,
    required: true,
    description: 'Category id',
  })
  @ApiBody({
    type: UpdateControlListCategoryDto,
    description: 'Update a category',
  })
  @Roles(SecRolesEnum.SYSTEM_ADMIN, SecRolesEnum.TECHNICAL_SUPPORT)
  @UsePipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  )
  async updateCategory(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateControlListCategoryDto,
  ) {
    return this.controlListsService.updateCategory(id, dto).then((data) =>
      ResponseUtils.format({
        description: 'Category updated successfully',
        data,
        status: HttpStatus.OK,
      }),
    );
  }

  // A5
  @Delete('categories/:id')
  @ApiOperation({ summary: 'Delete a category' })
  @ApiParam({
    name: 'id',
    type: Number,
    required: true,
    description: 'Category id',
  })
  @Roles(SecRolesEnum.SYSTEM_ADMIN, SecRolesEnum.TECHNICAL_SUPPORT)
  async removeCategory(@Param('id', ParseIntPipe) id: number) {
    return this.controlListsService.removeCategory(id).then((data) =>
      ResponseUtils.format({
        description: `Category ${data.id} was deleted successfully`,
        data,
        status: HttpStatus.OK,
      }),
    );
  }

  // A6
  @Post('lists')
  @ApiOperation({ summary: 'Create a list' })
  @ApiBody({
    type: CreateControlListDto,
    description: 'Create a list',
  })
  @Roles(SecRolesEnum.SYSTEM_ADMIN, SecRolesEnum.TECHNICAL_SUPPORT)
  @UsePipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  )
  async createList(@Body() dto: CreateControlListDto) {
    return this.controlListsService.createList(dto).then((data) =>
      ResponseUtils.format({
        description: 'List created successfully',
        data,
        status: HttpStatus.CREATED,
      }),
    );
  }

  // A7
  @Patch('lists/:id')
  @ApiOperation({ summary: 'Update a list' })
  @ApiParam({
    name: 'id',
    type: Number,
    required: true,
    description: 'List id',
  })
  @ApiBody({
    type: UpdateControlListDto,
    description: 'Update a list',
  })
  @Roles(SecRolesEnum.SYSTEM_ADMIN, SecRolesEnum.TECHNICAL_SUPPORT)
  @UsePipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  )
  async updateList(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateControlListDto,
  ) {
    return this.controlListsService.updateList(id, dto).then((data) =>
      ResponseUtils.format({
        description: 'List updated successfully',
        data,
        status: HttpStatus.OK,
      }),
    );
  }

  // A8
  @Delete('lists/:id')
  @ApiOperation({ summary: 'Delete a list' })
  @ApiParam({
    name: 'id',
    type: Number,
    required: true,
    description: 'List id',
  })
  @Roles(SecRolesEnum.SYSTEM_ADMIN, SecRolesEnum.TECHNICAL_SUPPORT)
  async removeList(@Param('id', ParseIntPipe) id: number) {
    return this.controlListsService.removeList(id).then((data) =>
      ResponseUtils.format({
        description: `List ${data.id} was deleted successfully`,
        data,
        status: HttpStatus.OK,
      }),
    );
  }

  // A9
  @Get('lists/:id/values')
  @ApiOperation({ summary: 'List the values of a list' })
  @ApiParam({
    name: 'id',
    type: Number,
    required: true,
    description: 'List id',
  })
  @Roles(SecRolesEnum.SYSTEM_ADMIN, SecRolesEnum.TECHNICAL_SUPPORT)
  async getValues(@Param('id', ParseIntPipe) id: number) {
    return this.controlListsService.getValues(id).then((data) =>
      ResponseUtils.format({
        description: 'Values found',
        data,
        status: HttpStatus.OK,
      }),
    );
  }

  // A10
  @Post('lists/:id/values')
  @ApiOperation({ summary: 'Create a value in a list' })
  @ApiParam({
    name: 'id',
    type: Number,
    required: true,
    description: 'List id',
  })
  @ApiBody({
    type: CreateControlListValueDto,
    description: 'Create a value',
  })
  @Roles(SecRolesEnum.SYSTEM_ADMIN, SecRolesEnum.TECHNICAL_SUPPORT)
  @UsePipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  )
  async createValue(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CreateControlListValueDto,
  ) {
    return this.controlListsService.createValue(id, dto).then((data) =>
      ResponseUtils.format({
        description: 'Value created successfully',
        data,
        status: HttpStatus.CREATED,
      }),
    );
  }

  // A11
  @Patch('values/:id')
  @ApiOperation({ summary: 'Update a value' })
  @ApiParam({
    name: 'id',
    type: Number,
    required: true,
    description: 'Value id',
  })
  @ApiBody({
    type: UpdateControlListValueDto,
    description: 'Update a value',
  })
  @Roles(SecRolesEnum.SYSTEM_ADMIN, SecRolesEnum.TECHNICAL_SUPPORT)
  @UsePipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  )
  async updateValue(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateControlListValueDto,
  ) {
    return this.controlListsService.updateValue(id, dto).then((data) =>
      ResponseUtils.format({
        description: 'Value updated successfully',
        data,
        status: HttpStatus.OK,
      }),
    );
  }

  // A12
  @Delete('values/:id')
  @ApiOperation({ summary: 'Delete a value' })
  @ApiParam({
    name: 'id',
    type: Number,
    required: true,
    description: 'Value id',
  })
  @Roles(SecRolesEnum.SYSTEM_ADMIN, SecRolesEnum.TECHNICAL_SUPPORT)
  async removeValue(@Param('id', ParseIntPipe) id: number) {
    return this.controlListsService.removeValue(id).then((data) =>
      ResponseUtils.format({
        description: `Value ${data.id} was deleted successfully`,
        data,
        status: HttpStatus.OK,
      }),
    );
  }

  // A13 (design.md §4, §8, R-CTL-006): the consumer read. Deliberately
  // carries NO @Roles decorator — RolesGuard allows any request through
  // when a handler declares no roles metadata (roles.guard.ts:16-18), and
  // JwtMiddleware already rejects an unauthenticated request before this
  // controller is ever reached, so "no @Roles" here means "any
  // authenticated user", not "public".
  @Get('by-key/:listKey/values')
  @ApiOperation({
    summary:
      "Read a list's values by system key (consumer read, any authenticated user)",
  })
  @ApiParam({
    name: 'listKey',
    type: String,
    required: true,
    description: 'List system key',
  })
  @ApiQuery({
    name: 'activeOnly',
    type: Boolean,
    required: false,
    description: 'Omit inactive values when true (default true)',
  })
  @UsePipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  )
  async getValuesByKey(
    @Param('listKey') listKey: string,
    @Query() query: GetListValuesByKeyQueryDto,
  ) {
    return this.controlListsService
      .getValuesByKey(listKey, query.activeOnly ?? true)
      .then((data) =>
        ResponseUtils.format({
          description: 'Values found',
          data,
          status: HttpStatus.OK,
        }),
      );
  }
}
