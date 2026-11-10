import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
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
  ApiForbiddenResponse,
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
import { InactivateOrgUnitDto } from './dto/inactivate-org-unit.dto';
import { ReactivateOrgUnitDto } from './dto/reactivate-org-unit.dto';
import { DeleteOrgUnitQueryDto } from './dto/delete-org-unit-query.dto';
import { ChangeLogQueryDto } from './dto/change-log-query.dto';
import { ResolveQueryDto } from './dto/resolve-query.dto';
import { AncestorsQueryDto } from './dto/ancestors-query.dto';
import { RolesGuard } from '../../shared/guards/roles.guard';
import { HumanCredentialGuard } from '../../shared/guards/human-credential.guard';
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
// the code proposal (B3) and the staff search (B4); T-03 adds the history and
// change-log reads (B6, B7) and the lifecycle (B11 inactivate, B12 reactivate,
// B13 delete); T-04 adds the linked-data read (B8, admin) and the CONSUMER reads
// C1 `resolve`, C2 `ancestors`, C3 `successors`, which carry NO `@Roles` (any
// authenticated user, R-ORG-012; `JwtMiddleware` still rejects anonymous calls).
// There is NO write route under `change-log` (R-ORG-009 AC.2). No portfolio parameter
// anywhere (R-ORG-001 AC.1); a write body that sends `portfolioId` is a 400.
// T-13 (NFR-ORG-004): the writes B9-B13 also carry `HumanCredentialGuard`, so a
// machine (app-secret) token is a 403 even when its responsible user is an
// admin. Reads, C1-C3 included, stay open to machine tokens on purpose.
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
    summary:
      'Year view: every entry with the version that covers a year and that version’s delegates',
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
      'Also return entries inactivated or deleted from a year at or before the viewed one (default false). Each row carries `delegates`: the delegates of the version shown (the one covering the year, or the last one of an ended entry), never a current list',
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

  // B7 - literal route, declared before the `units/:id` routes.
  @Get('change-log')
  @ApiOperation({
    summary:
      'Change log of one entry, newest first (works after a physical delete)',
  })
  @ApiQuery({
    name: 'unitId',
    type: Number,
    required: true,
    description:
      'Permanent entry id. Required; missing or not a number returns 400',
  })
  @Roles(SecRolesEnum.CENTER_ADMIN, SecRolesEnum.SYSTEM_ADMIN)
  @UsePipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  )
  async getChangeLog(@Query() query: ChangeLogQueryDto) {
    return this.readService.getChangeLog(query.unitId).then((data) =>
      ResponseUtils.format({
        description: 'Change log found',
        data,
        status: HttpStatus.OK,
      }),
    );
  }

  // C1 - literal route, declared before the `units/:id` routes. Consumer read: NO @Roles.
  @Get('resolve')
  @ApiOperation({
    summary:
      'Resolve entries for a year: the covering version, the status that year and the delegates of that version (any authenticated user)',
  })
  @ApiQuery({
    name: 'ids',
    type: String,
    required: true,
    description:
      'Permanent entry ids, comma-separated, 1 to 200. Missing or more than 200 returns 400; an id that does not exist returns { id, missing: true } in its place (200)',
  })
  @ApiQuery({
    name: 'year',
    type: Number,
    required: false,
    description:
      'Structure year (default: current year). Accepted: 2000 to current year + 10; otherwise 400. A year with no covering version returns the row with `version: null` and the status of that year',
  })
  @ApiOkResponse({
    description:
      "data = one row per distinct id, in request order. A resolved row: { id, code, year, status ('active' | 'inactive' | 'deleted' as of that year), statusFromYear, successorId, version, delegates }. `delegates` are the delegates of the covering version, i.e. of the requested year (a consumer that wants who acts now must ask for the current year), and `[]` when `version` is null. `version` is the covering version, or null when none covers the year: at or after the entry's end, inside a reactivation gap (status of that year), or before its first version (status 'inactive', not distinguishable from a gap year). An id that does not exist is { id, missing: true } in its place and the call still returns 200",
  })
  @UsePipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  )
  async resolve(@Query() query: ResolveQueryDto) {
    return this.readService.resolve(query.ids, query.year).then((data) =>
      ResponseUtils.format({
        description: 'Organizational units resolved',
        data,
        status: HttpStatus.OK,
      }),
    );
  }

  // B5 — declared after every literal route so `:id` cannot swallow them.
  @Get('units/:id')
  @ApiOperation({
    summary:
      'One entry with all its versions, each with its director and its own delegates',
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

  // B6
  @Get('units/:id/history')
  @ApiOperation({
    summary:
      "An entry's versions (oldest first, each with its delegates) and its change log (newest first; rows written as delegates_change before the delegates became versioned stay readable)",
  })
  @ApiParam({
    name: 'id',
    type: Number,
    required: true,
    description:
      'Permanent entry id. A physically deleted id returns 404: read its log through B7',
  })
  @Roles(SecRolesEnum.CENTER_ADMIN, SecRolesEnum.SYSTEM_ADMIN)
  async getUnitHistory(@Param('id', ParseIntPipe) id: number) {
    return this.readService.getUnitHistory(id).then((data) =>
      ResponseUtils.format({
        description: 'Organizational unit history found',
        data,
        status: HttpStatus.OK,
      }),
    );
  }

  // B8
  @Get('units/:id/linked-data')
  @ApiOperation({
    summary:
      'Linked data of an entry: child count and the records each registered consumer holds',
  })
  @ApiParam({
    name: 'id',
    type: Number,
    required: true,
    description: 'Permanent entry id',
  })
  @ApiOkResponse({
    description:
      'data = { childCount, consumers: [{ consumer, count }] }; consumers reporting 0 are left out, so an entry with no linked data returns childCount 0 and an empty list',
  })
  @Roles(SecRolesEnum.CENTER_ADMIN, SecRolesEnum.SYSTEM_ADMIN)
  async getLinkedData(@Param('id', ParseIntPipe) id: number) {
    return this.readService.getLinkedData(id).then((data) =>
      ResponseUtils.format({
        description: 'Linked data found',
        data,
        status: HttpStatus.OK,
      }),
    );
  }

  // C2. Consumer read: NO @Roles.
  @Get('units/:id/ancestors')
  @ApiOperation({
    summary:
      'Chain from an entry up to its L1 root as of a year, entry first (any authenticated user)',
  })
  @ApiParam({
    name: 'id',
    type: Number,
    required: true,
    description: 'Permanent entry id. Unknown returns 404',
  })
  @ApiQuery({
    name: 'year',
    type: Number,
    required: false,
    description:
      'Structure year (default: current year). 400 when out of range or when the entry has no version covering it',
  })
  @UsePipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  )
  async getAncestors(
    @Param('id', ParseIntPipe) id: number,
    @Query() query: AncestorsQueryDto,
  ) {
    return this.readService.ancestors(id, query.year).then((data) =>
      ResponseUtils.format({
        description: 'Ancestors found',
        data,
        status: HttpStatus.OK,
      }),
    );
  }

  // C3. Consumer read: NO @Roles.
  @Get('units/:id/successors')
  @ApiOperation({
    summary:
      'Successor chain of an entry in order, first successor first (any authenticated user)',
  })
  @ApiParam({
    name: 'id',
    type: Number,
    required: true,
    description: 'Permanent entry id. Unknown returns 404',
  })
  async getSuccessors(@Param('id', ParseIntPipe) id: number) {
    return this.readService.successors(id).then((data) =>
      ResponseUtils.format({
        description: 'Successors found',
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
      'data = the B5 shape (entry and its versions, each with its delegates) plus `outcome`: what the save actually did',
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
  @UseGuards(HumanCredentialGuard)
  @ApiForbiddenResponse({
    description:
      'The caller lacks CENTER_ADMIN / SYSTEM_ADMIN, or authenticated with a machine (app-secret) credential: writes need a signed-in user',
  })
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
      'Change an entry: edits a version in place, splits one, back-dates and/or changes the code. Delegates are a versioned field like the director, so delegateCarnets needs appliesFromYear',
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
      'data = the B5 shape (entry and its versions, each with its delegates) plus `outcome`: what the save actually did',
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
  @UseGuards(HumanCredentialGuard)
  @ApiForbiddenResponse({
    description:
      'The caller lacks CENTER_ADMIN / SYSTEM_ADMIN, or authenticated with a machine (app-secret) credential: writes need a signed-in user',
  })
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

  // B11
  @Post('units/:id/inactivate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Inactivate an entry from a year, with an optional successor (blocked by children active from that year)',
  })
  @ApiParam({
    name: 'id',
    type: Number,
    required: true,
    description: 'Permanent entry id',
  })
  @ApiBody({ type: InactivateOrgUnitDto })
  @ApiOkResponse({
    description:
      'data = the B5 shape (entry and its versions, each with its delegates)',
  })
  @Roles(SecRolesEnum.CENTER_ADMIN, SecRolesEnum.SYSTEM_ADMIN)
  @UseGuards(HumanCredentialGuard)
  @ApiForbiddenResponse({
    description:
      'The caller lacks CENTER_ADMIN / SYSTEM_ADMIN, or authenticated with a machine (app-secret) credential: writes need a signed-in user',
  })
  @UsePipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  )
  async inactivateUnit(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: InactivateOrgUnitDto,
  ) {
    return this.service.inactivate(id, body).then((data) =>
      ResponseUtils.format({
        description: 'Organizational unit inactivated',
        data,
        status: HttpStatus.OK,
      }),
    );
  }

  // B12
  @Post('units/:id/reactivate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Reactivate an inactive entry from a year (a deleted entry cannot be reactivated)',
  })
  @ApiParam({
    name: 'id',
    type: Number,
    required: true,
    description: 'Permanent entry id',
  })
  @ApiBody({ type: ReactivateOrgUnitDto })
  @ApiOkResponse({
    description:
      'data = the B5 shape (entry and its versions, each with its delegates)',
  })
  @Roles(SecRolesEnum.CENTER_ADMIN, SecRolesEnum.SYSTEM_ADMIN)
  @UseGuards(HumanCredentialGuard)
  @ApiForbiddenResponse({
    description:
      'The caller lacks CENTER_ADMIN / SYSTEM_ADMIN, or authenticated with a machine (app-secret) credential: writes need a signed-in user',
  })
  @UsePipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  )
  async reactivateUnit(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: ReactivateOrgUnitDto,
  ) {
    return this.service.reactivate(id, body).then((data) =>
      ResponseUtils.format({
        description: 'Organizational unit reactivated',
        data,
        status: HttpStatus.OK,
      }),
    );
  }

  // B13
  @Delete('units/:id')
  @ApiOperation({
    summary:
      'Delete an entry: physical when it was created in the current year or later, otherwise logical from a year',
  })
  @ApiParam({
    name: 'id',
    type: Number,
    required: true,
    description: 'Permanent entry id',
  })
  @ApiQuery({
    name: 'fromYear',
    type: Number,
    required: false,
    description:
      'Logical delete of an active entry only: year it ends from (default: current year; later than its first year). Ignored for a physical delete and for an already-inactive entry, which keeps its end year',
  })
  @ApiQuery({
    name: 'backdate',
    type: Boolean,
    required: false,
    description:
      'Logical delete of an active entry only: confirms a back-date (fromYear before the current year). Ignored otherwise',
  })
  @ApiOkResponse({
    description:
      "data = { id, mode, fromYear }: mode is 'physical' or 'logical'; fromYear is the end year actually applied (null for a physical delete; the existing end year for an already-inactive entry)",
  })
  @Roles(SecRolesEnum.CENTER_ADMIN, SecRolesEnum.SYSTEM_ADMIN)
  @UseGuards(HumanCredentialGuard)
  @ApiForbiddenResponse({
    description:
      'The caller lacks CENTER_ADMIN / SYSTEM_ADMIN, or authenticated with a machine (app-secret) credential: writes need a signed-in user',
  })
  @UsePipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  )
  async deleteUnit(
    @Param('id', ParseIntPipe) id: number,
    @Query() query: DeleteOrgUnitQueryDto,
  ) {
    return this.service.remove(id, query).then((data) =>
      ResponseUtils.format({
        description: 'Organizational unit deleted',
        data,
        status: HttpStatus.OK,
      }),
    );
  }
}
