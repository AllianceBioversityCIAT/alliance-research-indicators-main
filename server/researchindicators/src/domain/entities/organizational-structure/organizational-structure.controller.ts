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
  UseGuards,
  UseInterceptors,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiCreatedResponse,
  ApiExtraModels,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
  getSchemaPath,
} from '@nestjs/swagger';
import { OrgStructureReadService } from './org-structure-read.service';
import { OrgStructureService } from './organizational-structure.service';
import { CreateOrgUnitDto } from './dto/create-org-unit.dto';
import { UpdateOrgUnitDto } from './dto/update-org-unit.dto';
import { OrgSaveOutcomeDto } from './dto/org-save-outcome.dto';
import { SearchStaffQueryDto } from './dto/search-staff-query.dto';
import { GetYearViewQueryDto } from './dto/get-year-view-query.dto';
import { RolesGuard } from '../../shared/guards/roles.guard';
import { SetUpInterceptor } from '../../shared/Interceptors/setup.interceptor';
import { ResponseUtils } from '../../shared/utils/response.utils';
import { Roles } from '../../shared/decorators/roles.decorator';
import { SecRolesEnum } from '../../shared/enum/sec_role.enum';

// Organizational Structure admin API (design.md section 4, 8; R-ORG-012,
// NFR-ORG-004). Every handler here is admin-only: CENTER_ADMIN or
// SYSTEM_ADMIN (SYSTEM_ADMIN also bypasses in RolesGuard). TECHNICAL_SUPPORT
// is NOT granted (D-CTL-7). Mounted at `/api/organizational-structure`,
// unversioned. LITERAL routes are declared before the `:id` route.
//
// T-01 holds the read half (B1, B2, B5); T-02 adds the save engine (B9, B10),
// the code proposal (B3) and the staff search (B4). No portfolio parameter
// anywhere (R-ORG-001 AC.1); a write body that sends `portfolioId` is a 400.
@Controller()
@ApiTags('Organizational Structure')
@ApiBearerAuth()
@ApiExtraModels(OrgSaveOutcomeDto)
@UseInterceptors(SetUpInterceptor)
@UseGuards(RolesGuard)
export class OrganizationalStructureController {
  constructor(
    private readonly readService: OrgStructureReadService,
    private readonly service: OrgStructureService,
  ) {}

  // B1
  @Get('units')
  @ApiOperation({
    summary: 'Year view: every entry with the version that covers a year',
  })
  @ApiQuery({
    name: 'year',
    type: Number,
    required: false,
    description:
      'Structure year (default: current year). Accepted: 2000 to current year + 10; otherwise 400',
  })
  @ApiQuery({
    name: 'includeEnded',
    type: Boolean,
    required: false,
    description:
      'Also return entries inactivated or deleted from a year at or before the viewed one (default false)',
  })
  @Roles(SecRolesEnum.CENTER_ADMIN, SecRolesEnum.SYSTEM_ADMIN)
  @UsePipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  )
  async getYearView(@Query() query: GetYearViewQueryDto) {
    return this.readService
      .getYearView(query.year, query.includeEnded)
      .then((data) =>
        ResponseUtils.format({
          description: 'Year view found',
          data,
          status: HttpStatus.OK,
        }),
      );
  }

  // B3 — literal route, declared before `units/:id`.
  @Get('units/code-proposal')
  @ApiOperation({
    summary: 'Proposed code for a new entry: ORG- plus the next free number',
  })
  @Roles(SecRolesEnum.CENTER_ADMIN, SecRolesEnum.SYSTEM_ADMIN)
  async getCodeProposal() {
    return this.service.proposeCode().then((data) =>
      ResponseUtils.format({
        description: 'Code proposed',
        data,
        status: HttpStatus.OK,
      }),
    );
  }

  // B4
  @Get('staff')
  @ApiOperation({
    summary:
      'Staff picker for director and delegates: active staff only, at most 20',
  })
  @ApiQuery({
    name: 'search',
    type: String,
    required: true,
    description: 'Name or email fragment, at least 2 characters; otherwise 400',
  })
  @Roles(SecRolesEnum.CENTER_ADMIN, SecRolesEnum.SYSTEM_ADMIN)
  @UsePipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  )
  async searchStaff(@Query() query: SearchStaffQueryDto) {
    return this.service.searchStaff(query.search).then((data) =>
      ResponseUtils.format({
        description: 'Staff found',
        data,
        status: HttpStatus.OK,
      }),
    );
  }

  // B2
  @Get('years')
  @ApiOperation({
    summary: 'Selectable structure years: earliest, latest and current',
  })
  @Roles(SecRolesEnum.CENTER_ADMIN, SecRolesEnum.SYSTEM_ADMIN)
  async getYears() {
    return this.readService.getYearRange().then((data) =>
      ResponseUtils.format({
        description: 'Structure years found',
        data,
        status: HttpStatus.OK,
      }),
    );
  }

  // B5 — declared after every literal route so `:id` cannot swallow them.
  @Get('units/:id')
  @ApiOperation({
    summary: 'One entry with all its versions and its current delegates',
  })
  @ApiParam({
    name: 'id',
    type: Number,
    required: true,
    description: 'Permanent entry id',
  })
  @Roles(SecRolesEnum.CENTER_ADMIN, SecRolesEnum.SYSTEM_ADMIN)
  async getUnit(@Param('id', ParseIntPipe) id: number) {
    return this.readService.getUnitDetail(id).then((data) =>
      ResponseUtils.format({
        description: 'Organizational unit found',
        data,
        status: HttpStatus.OK,
      }),
    );
  }

  // B9
  @Post('units')
  @ApiOperation({
    summary:
      'Create an entry with its first version (a first year before the current one needs backdate=true)',
  })
  @ApiBody({ type: CreateOrgUnitDto })
  @ApiCreatedResponse({
    description:
      'data = the B5 shape (entry, versions, delegates) plus `outcome`: what the save actually did',
    schema: {
      type: 'object',
      properties: {
        data: {
          type: 'object',
          properties: {
            outcome: { $ref: getSchemaPath(OrgSaveOutcomeDto) },
          },
        },
      },
    },
  })
  @Roles(SecRolesEnum.CENTER_ADMIN, SecRolesEnum.SYSTEM_ADMIN)
  @UsePipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  )
  async createUnit(@Body() body: CreateOrgUnitDto) {
    return this.service.create(body).then((data) =>
      ResponseUtils.format({
        description: 'Organizational unit created',
        data,
        status: HttpStatus.CREATED,
      }),
    );
  }

  // B10
  @Patch('units/:id')
  @ApiOperation({
    summary:
      'Change an entry: edits a version in place, splits one, back-dates, changes the code and/or replaces the delegates',
  })
  @ApiParam({
    name: 'id',
    type: Number,
    required: true,
    description: 'Permanent entry id',
  })
  @ApiBody({ type: UpdateOrgUnitDto })
  @ApiOkResponse({
    description:
      'data = the B5 shape (entry, versions, delegates) plus `outcome`: what the save actually did',
    schema: {
      type: 'object',
      properties: {
        data: {
          type: 'object',
          properties: {
            outcome: { $ref: getSchemaPath(OrgSaveOutcomeDto) },
          },
        },
      },
    },
  })
  @Roles(SecRolesEnum.CENTER_ADMIN, SecRolesEnum.SYSTEM_ADMIN)
  @UsePipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  )
  async updateUnit(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: UpdateOrgUnitDto,
  ) {
    return this.service.update(id, body).then((data) =>
      ResponseUtils.format({
        description: 'Organizational unit updated',
        data,
        status: HttpStatus.OK,
      }),
    );
  }
}
