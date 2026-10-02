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
import { RolesGuard } from '../../shared/guards/roles.guard';
import { SetUpInterceptor } from '../../shared/Interceptors/setup.interceptor';
import { ResponseUtils } from '../../shared/utils/response.utils';
import { Roles } from '../../shared/decorators/roles.decorator';
import { SecRolesEnum } from '../../shared/enum/sec_role.enum';

// Admin-only module (design.md §8, D-CTL-7): every handler here is
// CENTER_ADMIN / SYSTEM_ADMIN. TECHNICAL_SUPPORT is deliberately NOT
// granted, unlike portfolios.controller.ts's broader set. A13 (the consumer
// read, open to any authenticated user) belongs to T-04, not this slice.
@Controller()
@ApiTags('Control Lists')
@ApiBearerAuth()
@UseInterceptors(SetUpInterceptor)
@UseGuards(RolesGuard)
export class ControlListsController {
  constructor(private readonly controlListsService: ControlListsService) {}

  // A1
  @Get('categories')
  @ApiOperation({ summary: 'List categories for a portfolio' })
  @ApiQuery({
    name: 'portfolioId',
    type: Number,
    required: true,
    description: 'Portfolio id to scope the read',
  })
  @Roles(SecRolesEnum.CENTER_ADMIN, SecRolesEnum.SYSTEM_ADMIN)
  @UsePipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  )
  async getCategories(@Query() query: GetCategoriesQueryDto) {
    return this.controlListsService
      .getCategories(query.portfolioId)
      .then((data) =>
        ResponseUtils.format({
          description: 'Categories found',
          data,
          status: HttpStatus.OK,
        }),
      );
  }

  // A2
  @Get('portfolios/summary')
  @ApiOperation({ summary: 'Category count per portfolio' })
  @Roles(SecRolesEnum.CENTER_ADMIN, SecRolesEnum.SYSTEM_ADMIN)
  async getPortfoliosSummary() {
    return this.controlListsService.getPortfoliosSummary().then((data) =>
      ResponseUtils.format({
        description: 'Portfolio category summary found',
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
  @Roles(SecRolesEnum.CENTER_ADMIN, SecRolesEnum.SYSTEM_ADMIN)
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
  @Roles(SecRolesEnum.CENTER_ADMIN, SecRolesEnum.SYSTEM_ADMIN)
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
  @Roles(SecRolesEnum.CENTER_ADMIN, SecRolesEnum.SYSTEM_ADMIN)
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
  @Roles(SecRolesEnum.CENTER_ADMIN, SecRolesEnum.SYSTEM_ADMIN)
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
  @Roles(SecRolesEnum.CENTER_ADMIN, SecRolesEnum.SYSTEM_ADMIN)
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
  @Roles(SecRolesEnum.CENTER_ADMIN, SecRolesEnum.SYSTEM_ADMIN)
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
  @Roles(SecRolesEnum.CENTER_ADMIN, SecRolesEnum.SYSTEM_ADMIN)
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
  @Roles(SecRolesEnum.CENTER_ADMIN, SecRolesEnum.SYSTEM_ADMIN)
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
  @Roles(SecRolesEnum.CENTER_ADMIN, SecRolesEnum.SYSTEM_ADMIN)
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
  @Roles(SecRolesEnum.CENTER_ADMIN, SecRolesEnum.SYSTEM_ADMIN)
  async removeValue(@Param('id', ParseIntPipe) id: number) {
    return this.controlListsService.removeValue(id).then((data) =>
      ResponseUtils.format({
        description: `Value ${data.id} was deleted successfully`,
        data,
        status: HttpStatus.OK,
      }),
    );
  }
}
