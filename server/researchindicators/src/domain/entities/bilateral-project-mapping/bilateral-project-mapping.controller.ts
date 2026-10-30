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
  ApiProperty,
  ApiPropertyOptional,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { Request } from 'express';
import { User } from '../../complementary-entities/secondary/user/user.entity';
import { Roles } from '../../shared/decorators/roles.decorator';
import { SecRolesEnum } from '../../shared/enum/sec_role.enum';
import { RolesGuard } from '../../shared/guards/roles.guard';
import { ResponseUtils } from '../../shared/utils/response.utils';
import { BilateralProjectMappingService } from './bilateral-project-mapping.service';
import { BilateralMappingCoverageService } from './bilateral-mapping-coverage.service';
import { CreateBilateralProjectMappingDto } from './dto/create-bilateral-project-mapping.dto';
import { UpdateBilateralProjectMappingDto } from './dto/update-bilateral-project-mapping.dto';
import { ListBilateralProjectMappingsQueryDto } from './dto/list-bilateral-project-mappings.query.dto';
import { CoverageReportQueryDto } from './dto/coverage-report.query.dto';

type RequestWithUser = Request & { user?: User };

class BilateralProjectMappingNotesDto {
  @ApiPropertyOptional({
    description: 'Optional operator note recorded on the row',
  })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({
    description: 'Re-point to a different CLARISA project while activating',
    minimum: 1,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  clarisa_project_id?: number;

  @ApiPropertyOptional({
    description:
      'Optional activation justification. Trimmed; at most 500 characters. Written to status_justification only when non-blank.',
    maxLength: 500,
    example: 'Contract renewed',
  })
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MaxLength(500)
  justification?: string;
}

class DeactivateBilateralProjectMappingDto {
  @ApiProperty({
    description:
      'Required inactivation justification. Trimmed; must be 1–500 characters. Stored in status_justification.',
    maxLength: 500,
    example: 'Contract closed',
  })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  justification!: string;

  @ApiPropertyOptional({
    description:
      'Optional operator note. Trimmed; at most 500 characters. Written only when supplied.',
    maxLength: 500,
  })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}

// @sdd-spec docs/specs/bilateral-module/pending-items — T-15.14 / R-BIL-080
// @sdd-spec docs/specs/bilateral/clarisa-project-automapping — T-05 / R-CPA-006 / DD-12
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
  constructor(
    private readonly service: BilateralProjectMappingService,
    private readonly coverageService: BilateralMappingCoverageService,
  ) {}

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

  // @sdd-spec docs/specs/bilateral/clarisa-project-automapping — T-05 / R-CPA-006 / DD-12
  // MUST be declared ABOVE @Get(':id') so Nest matches route before ParseIntPipe.
  @Get('coverage-report')
  @ApiOperation({
    summary:
      'Generate coverage report classifying bilateral contracts against CLARISA projects',
  })
  @ApiQuery({
    name: 'limit-samples',
    required: false,
    type: Number,
    description:
      'Maximum number of sample items per resolution tier (1-50, default 10)',
  })
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  async getCoverageReport(@Query() query: CoverageReportQueryDto) {
    const limitSamples = query['limit-samples'];
    return this.coverageService.getCoverageReport(limitSamples).then((data) =>
      ResponseUtils.format({
        data,
        description: data.environment.upstream_contract_available
          ? 'Bilateral mapping coverage report generated'
          : `Bilateral mapping coverage report: upstream contract is not published in the measured environment (${data.environment.clarisa_host})`,
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
    return this.service.create(payload, request.user).then((data) => {
      const updated = data.outcome === 'updated';
      return ResponseUtils.format({
        data,
        description: updated
          ? 'Bilateral project mapping updated'
          : 'Bilateral project mapping created',
        status: updated ? HttpStatus.OK : HttpStatus.CREATED,
      });
    });
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

  @Patch(':id/activate')
  @ApiOperation({
    summary:
      'Reactivate a current-year bilateral project mapping. A prior-year id is not found.',
  })
  @ApiParam({ name: 'id', type: Number })
  @ApiBody({ type: BilateralProjectMappingNotesDto, required: false })
  @UsePipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  )
  async activate(
    @Req() request: RequestWithUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() body?: BilateralProjectMappingNotesDto,
  ) {
    return this.service
      .activate(
        id,
        request.user,
        body?.notes,
        body?.clarisa_project_id,
        body?.justification,
      )
      .then((data) =>
        ResponseUtils.format({
          data,
          description: 'Bilateral project mapping activated',
          status: HttpStatus.OK,
        }),
      );
  }

  @Patch(':id/deactivate')
  @ApiOperation({
    summary:
      'Soft-deactivate a bilateral project mapping. A justification is required.',
  })
  @ApiParam({ name: 'id', type: Number })
  @ApiBody({ type: DeactivateBilateralProjectMappingDto, required: true })
  @UsePipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  )
  async deactivate(
    @Req() request: RequestWithUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: DeactivateBilateralProjectMappingDto,
  ) {
    return this.service
      .deactivate(id, request.user, body.justification, body.notes)
      .then((data) =>
        ResponseUtils.format({
          data,
          description: 'Bilateral project mapping deactivated',
          status: HttpStatus.OK,
        }),
      );
  }
}
