import {
  Body,
  Controller,
  Get,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { Request } from 'express';
import { User } from '../../complementary-entities/secondary/user/user.entity';
import { Roles } from '../../shared/decorators/roles.decorator';
import { SecRolesEnum } from '../../shared/enum/sec_role.enum';
import { RolesGuard } from '../../shared/guards/roles.guard';
import { ResponseUtils } from '../../shared/utils/response.utils';
import { BilateralProjectMappingService } from './bilateral-project-mapping.service';
import { CreateBilateralProjectMappingDto } from './dto/create-bilateral-project-mapping.dto';
import { UpdateBilateralProjectMappingDto } from './dto/update-bilateral-project-mapping.dto';
import { ListBilateralProjectMappingsQueryDto } from './dto/list-bilateral-project-mappings.query.dto';

type RequestWithUser = Request & { user?: User };

class DeactivateBilateralProjectMappingDto {
  notes?: string;
}

// @sdd-spec docs/specs/bilateral-module/pending-items — T-15.14 / R-BIL-080
//
// Admin REST surface mounted at /api/bilateral-project-mappings (path
// registration in domain/routes/main.routes.ts). NOTE: the path intentionally
// does NOT contain /admin — see execution.md Pivot Record #1. Role gating is
// enforced via @Roles(CENTER_ADMIN, SYSTEM_ADMIN); URL is design-only.
// All mutations route the calling User through the service so audit fields
// are written from request.user, not from any global util.
@ApiTags('Bilateral / Admin')
@ApiBearerAuth()
@UseGuards(RolesGuard)
@Roles(SecRolesEnum.CENTER_ADMIN, SecRolesEnum.SYSTEM_ADMIN)
@Controller()
export class BilateralProjectMappingController {
  constructor(private readonly service: BilateralProjectMappingService) {}

  @Get()
  @ApiOperation({ summary: 'List bilateral project mappings (paginated)' })
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  async list(@Query() query: ListBilateralProjectMappingsQueryDto) {
    return this.service.list(query).then((data) =>
      ResponseUtils.format({
        data,
        description: 'Bilateral project mappings found',
        status: HttpStatus.OK,
      }),
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a bilateral project mapping by id' })
  @ApiParam({ name: 'id', type: Number })
  async findById(@Param('id', ParseIntPipe) id: number) {
    return this.service.findById(id).then((data) =>
      ResponseUtils.format({
        data,
        description: 'Bilateral project mapping found',
        status: HttpStatus.OK,
      }),
    );
  }

  @Post()
  @ApiOperation({ summary: 'Create a bilateral project mapping' })
  @ApiBody({ type: CreateBilateralProjectMappingDto })
  @UsePipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  )
  async create(
    @Req() request: RequestWithUser,
    @Body() payload: CreateBilateralProjectMappingDto,
  ) {
    return this.service.create(payload, request.user).then((data) =>
      ResponseUtils.format({
        data,
        description: 'Bilateral project mapping created',
        status: HttpStatus.CREATED,
      }),
    );
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a bilateral project mapping' })
  @ApiParam({ name: 'id', type: Number })
  @ApiBody({ type: UpdateBilateralProjectMappingDto })
  @UsePipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  )
  async update(
    @Req() request: RequestWithUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() payload: UpdateBilateralProjectMappingDto,
  ) {
    return this.service.update(id, payload, request.user).then((data) =>
      ResponseUtils.format({
        data,
        description: 'Bilateral project mapping updated',
        status: HttpStatus.OK,
      }),
    );
  }

  @Patch(':id/deactivate')
  @ApiOperation({ summary: 'Soft-deactivate a bilateral project mapping' })
  @ApiParam({ name: 'id', type: Number })
  async deactivate(
    @Req() request: RequestWithUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() body?: DeactivateBilateralProjectMappingDto,
  ) {
    return this.service.deactivate(id, request.user, body?.notes).then((data) =>
      ResponseUtils.format({
        data,
        description: 'Bilateral project mapping deactivated',
        status: HttpStatus.OK,
      }),
    );
  }
}
