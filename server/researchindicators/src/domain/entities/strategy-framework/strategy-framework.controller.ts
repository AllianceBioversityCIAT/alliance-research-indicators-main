import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
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
  ApiExtraModels,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { FrameworkReadService } from './framework-read.service';
import { StrategyFrameworkService } from './strategy-framework.service';
import { proposeElementCode, proposeIobCode } from './framework-code.util';
import { badRequest } from './framework-errors';
import { CarryForwardObjectivesDto } from './dto/carry-forward-objectives.dto';
import {
  CodeProposalQueryDto,
  FrameworkResolveQueryDto,
  ObjectivesQueryDto,
  PortfolioIdQueryDto,
} from './dto/framework-query.dto';
import {
  CodeProposalDto,
  FrameworkEditorViewDto,
  FrameworkViewDto,
} from './dto/framework-swagger.dto';
import { CreateFrameworkElementDto } from './dto/create-framework-element.dto';
import { CreateInstitutionalObjectiveDto } from './dto/create-institutional-objective.dto';
import { ElementIdParamDto } from './dto/element-id-param.dto';
import { SearchStaffQueryDto } from './dto/search-staff-query.dto';
import { UpdateFrameworkElementDto } from './dto/update-framework-element.dto';
import { UpdateInstitutionalObjectiveDto } from './dto/update-institutional-objective.dto';
import { RolesGuard } from '../../shared/guards/roles.guard';
import { HumanCredentialGuard } from '../../shared/guards/human-credential.guard';
import { SetUpInterceptor } from '../../shared/Interceptors/setup.interceptor';
import { ResponseUtils } from '../../shared/utils/response.utils';
import { Roles } from '../../shared/decorators/roles.decorator';
import { SecRolesEnum } from '../../shared/enum/sec_role.enum';

// Strategy Framework API (design §4, §8; R-STF-014, NFR-STF-003, NFR-STF-005).
// Mounted at `/api/strategy-framework`, unversioned (no `@Version`).
// LITERAL routes are declared before any `:id` route.
//
// Admin reads and every write: ODS_ADMIN or SYSTEM_ADMIN (SYSTEM_ADMIN also
// bypasses in RolesGuard, P-4). Center Admin is not in the list.
// Writes also carry HumanCredentialGuard (D-STF-20): a machine token is 403
// even when its responsible user is an admin.
// Consumer reads A1 and A2 declare NO `@Roles` (any authenticated user,
// machine tokens included). They do not return editor fields.

const frameworkPipe = new ValidationPipe({
  whitelist: true,
  forbidNonWhitelisted: true,
  transform: true,
});

const ADMIN_FORBIDDEN =
  'The caller lacks ODS Admin or System Admin. Center Admin and every other role are denied. System Admin bypasses the role list.';

const WRITE_FORBIDDEN =
  'The caller lacks ODS Admin or System Admin, or authenticated with a machine (app-secret) credential: writes need a signed-in user.';

@Controller()
@ApiTags('Strategy Framework')
@ApiBearerAuth()
@ApiExtraModels(FrameworkViewDto, FrameworkEditorViewDto, CodeProposalDto)
@UseInterceptors(SetUpInterceptor)
@UseGuards(RolesGuard)
export class StrategyFrameworkController {
  constructor(
    private readonly read: FrameworkReadService,
    private readonly service: StrategyFrameworkService,
  ) {}

  // A0
  @Get('context')
  @ApiOperation({
    summary: 'Portfolios, the server year, and the default portfolio',
  })
  @ApiForbiddenResponse({ description: ADMIN_FORBIDDEN })
  @Roles(SecRolesEnum.ODS_ADMIN, SecRolesEnum.SYSTEM_ADMIN)
  getContext() {
    return this.read.getContext().then((data) =>
      ResponseUtils.format({
        description: 'Framework context found',
        data,
        status: HttpStatus.OK,
      }),
    );
  }

  // A1e — literal, before any `framework/:id` (there is none; kept first).
  @Get('framework/editor')
  @ApiOperation({
    summary: 'Admin framework read, including editor-only fields',
    description:
      'A1 plus, per element, usage, deletable and blockers. On the view, once, usageLabels is {consumerName, label}[] (D-STF-28). Editor-only; absent from the consumer read.',
  })
  @ApiQuery({ name: 'portfolioId', type: Number, required: true, example: 2 })
  @ApiOkResponse({
    description:
      'data is FrameworkEditorViewDto. usageLabels is a sibling of elements.',
    type: FrameworkEditorViewDto,
  })
  @ApiForbiddenResponse({ description: ADMIN_FORBIDDEN })
  @Roles(SecRolesEnum.ODS_ADMIN, SecRolesEnum.SYSTEM_ADMIN)
  @UsePipes(frameworkPipe)
  getEditor(@Query() query: PortfolioIdQueryDto) {
    return this.read.getEditor(query.portfolioId).then((data) =>
      ResponseUtils.format({
        description: 'Framework editor found',
        data,
        status: HttpStatus.OK,
      }),
    );
  }

  // A1 — consumer. No @Roles.
  @Get('framework')
  @ApiOperation({
    summary: 'Consumer framework read for one portfolio',
    description:
      'Elements carry no usage, deletable, blockers or usageLabels. Those live only on GET framework/editor.',
  })
  @ApiQuery({ name: 'portfolioId', type: Number, required: true, example: 2 })
  @ApiOkResponse({ type: FrameworkViewDto })
  @UsePipes(frameworkPipe)
  getFramework(@Query() query: PortfolioIdQueryDto) {
    return this.read.getFramework(query.portfolioId).then((data) =>
      ResponseUtils.format({
        description: 'Framework found',
        data,
        status: HttpStatus.OK,
      }),
    );
  }

  // A2 — consumer. No @Roles.
  @Get('resolve')
  @ApiOperation({
    summary: 'Resolve element ids to consumer rows, or missing',
  })
  @ApiQuery({
    name: 'ids',
    type: String,
    required: true,
    example: '1,2',
    description: 'Comma-separated element ids, at most 200',
  })
  @UsePipes(frameworkPipe)
  resolve(@Query() query: FrameworkResolveQueryDto) {
    return this.read.resolve(query.ids).then((data) =>
      ResponseUtils.format({
        description: 'Elements resolved',
        data,
        status: HttpStatus.OK,
      }),
    );
  }

  // A3
  @Get('code-proposal')
  @ApiOperation({
    summary: 'Next element code, or the next IOB code for a year',
    description:
      'parentId absent proposes a root code. kind=IOB proposes IOB-n for that portfolio and year (year is then required). The algorithm is framework-code.util (design 5.3).',
  })
  @ApiQuery({ name: 'portfolioId', type: Number, required: true, example: 2 })
  @ApiQuery({ name: 'parentId', type: Number, required: false })
  @ApiQuery({ name: 'year', type: Number, required: false, example: 2026 })
  @ApiQuery({ name: 'kind', enum: ['IOB'], required: false })
  @ApiOkResponse({ type: CodeProposalDto })
  @ApiForbiddenResponse({ description: ADMIN_FORBIDDEN })
  @Roles(SecRolesEnum.ODS_ADMIN, SecRolesEnum.SYSTEM_ADMIN)
  @UsePipes(frameworkPipe)
  async getCodeProposal(@Query() query: CodeProposalQueryDto) {
    const data =
      query.kind === 'IOB'
        ? await this.proposeIob(query)
        : await this.proposeElement(query);
    return ResponseUtils.format({
      description: 'Code proposed',
      data,
      status: HttpStatus.OK,
    });
  }

  // A4
  @Get('staff')
  @ApiOperation({
    summary: 'Active staff for the responsible picker, at most 20',
  })
  @ApiQuery({
    name: 'search',
    type: String,
    required: true,
    description: 'Name or email fragment, at least 2 characters',
  })
  @ApiForbiddenResponse({ description: ADMIN_FORBIDDEN })
  @Roles(SecRolesEnum.ODS_ADMIN, SecRolesEnum.SYSTEM_ADMIN)
  @UsePipes(frameworkPipe)
  searchStaff(@Query() query: SearchStaffQueryDto) {
    return this.service.searchStaff(query.search).then((data) =>
      ResponseUtils.format({
        description: 'Staff found',
        data,
        status: HttpStatus.OK,
      }),
    );
  }

  // A5
  @Post('elements')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create an element. The level is derived.' })
  @ApiBody({ type: CreateFrameworkElementDto })
  @ApiForbiddenResponse({ description: WRITE_FORBIDDEN })
  @Roles(SecRolesEnum.ODS_ADMIN, SecRolesEnum.SYSTEM_ADMIN)
  @UseGuards(HumanCredentialGuard)
  @UsePipes(frameworkPipe)
  createElement(@Body() dto: CreateFrameworkElementDto) {
    return this.service.createElement(dto).then((data) =>
      ResponseUtils.format({
        description: 'Element created',
        data,
        status: HttpStatus.CREATED,
      }),
    );
  }

  // A8 — literal segment after :id, declared before the :id writes.
  @Get('elements/:id/blockers')
  @ApiOperation({ summary: 'Blockers that would refuse deleting this element' })
  @ApiParam({ name: 'id', type: Number })
  @ApiForbiddenResponse({ description: ADMIN_FORBIDDEN })
  @Roles(SecRolesEnum.ODS_ADMIN, SecRolesEnum.SYSTEM_ADMIN)
  @UsePipes(frameworkPipe)
  getElementBlockers(@Param() params: ElementIdParamDto) {
    return this.read.getElementBlockers(params.id).then((data) =>
      ResponseUtils.format({
        description: 'Element blockers found',
        data,
        status: HttpStatus.OK,
      }),
    );
  }

  // A6
  @Patch('elements/:id')
  @ApiOperation({
    summary:
      'Update an element. parentId null, or on a depth-1 element, is 400.',
  })
  @ApiParam({ name: 'id', type: Number })
  @ApiBody({ type: UpdateFrameworkElementDto })
  @ApiForbiddenResponse({ description: WRITE_FORBIDDEN })
  @Roles(SecRolesEnum.ODS_ADMIN, SecRolesEnum.SYSTEM_ADMIN)
  @UseGuards(HumanCredentialGuard)
  @UsePipes(frameworkPipe)
  updateElement(
    @Param() params: ElementIdParamDto,
    @Body() dto: UpdateFrameworkElementDto,
  ) {
    return this.service.updateElement(params.id, dto).then((data) =>
      ResponseUtils.format({
        description: 'Element updated',
        data,
        status: HttpStatus.OK,
      }),
    );
  }

  // A7
  @Delete('elements/:id')
  @ApiOperation({ summary: 'Delete an element that nothing references' })
  @ApiParam({ name: 'id', type: Number })
  @ApiForbiddenResponse({ description: WRITE_FORBIDDEN })
  @Roles(SecRolesEnum.ODS_ADMIN, SecRolesEnum.SYSTEM_ADMIN)
  @UseGuards(HumanCredentialGuard)
  @UsePipes(frameworkPipe)
  deleteElement(@Param() params: ElementIdParamDto) {
    return this.service.deleteElement(params.id).then((data) =>
      ResponseUtils.format({
        description: 'Element deleted',
        data,
        status: HttpStatus.OK,
      }),
    );
  }

  // A9 years — literal, before `objectives/:id`.
  @Get('objectives/years')
  @ApiOperation({
    summary: 'Every year of the portfolio range, with objective counts',
  })
  @ApiQuery({ name: 'portfolioId', type: Number, required: true, example: 2 })
  @ApiForbiddenResponse({ description: ADMIN_FORBIDDEN })
  @Roles(SecRolesEnum.ODS_ADMIN, SecRolesEnum.SYSTEM_ADMIN)
  @UsePipes(frameworkPipe)
  getObjectiveYears(@Query() query: PortfolioIdQueryDto) {
    return this.read.getObjectiveYears(query.portfolioId).then((data) =>
      ResponseUtils.format({
        description: 'Objective years found',
        data,
        status: HttpStatus.OK,
      }),
    );
  }

  // A9 list
  @Get('objectives')
  @ApiOperation({
    summary: 'Institutional objectives of one portfolio and year',
  })
  @ApiQuery({ name: 'portfolioId', type: Number, required: true, example: 2 })
  @ApiQuery({ name: 'year', type: Number, required: true, example: 2026 })
  @ApiForbiddenResponse({ description: ADMIN_FORBIDDEN })
  @Roles(SecRolesEnum.ODS_ADMIN, SecRolesEnum.SYSTEM_ADMIN)
  @UsePipes(frameworkPipe)
  listObjectives(@Query() query: ObjectivesQueryDto) {
    return this.read
      .listObjectives(query.portfolioId, query.year)
      .then((data) =>
        ResponseUtils.format({
          description: 'Objectives found',
          data,
          status: HttpStatus.OK,
        }),
      );
  }

  // A11 — literal, before `objectives/:id`.
  @Post('objectives/carry-forward')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Copy one year of objectives onto the next year' })
  @ApiBody({ type: CarryForwardObjectivesDto })
  @ApiForbiddenResponse({ description: WRITE_FORBIDDEN })
  @Roles(SecRolesEnum.ODS_ADMIN, SecRolesEnum.SYSTEM_ADMIN)
  @UseGuards(HumanCredentialGuard)
  @UsePipes(frameworkPipe)
  carryForward(@Body() dto: CarryForwardObjectivesDto) {
    return this.service.carryForward(dto).then((data) =>
      ResponseUtils.format({
        description: 'Objectives carried forward',
        data,
        status: HttpStatus.OK,
      }),
    );
  }

  // A10 create
  @Post('objectives')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create an institutional objective' })
  @ApiBody({ type: CreateInstitutionalObjectiveDto })
  @ApiForbiddenResponse({ description: WRITE_FORBIDDEN })
  @Roles(SecRolesEnum.ODS_ADMIN, SecRolesEnum.SYSTEM_ADMIN)
  @UseGuards(HumanCredentialGuard)
  @UsePipes(frameworkPipe)
  createObjective(@Body() dto: CreateInstitutionalObjectiveDto) {
    return this.service.createObjective(dto).then((data) =>
      ResponseUtils.format({
        description: 'Objective created',
        data,
        status: HttpStatus.CREATED,
      }),
    );
  }

  // A10 update
  @Patch('objectives/:id')
  @ApiOperation({
    summary:
      'Update an institutional objective. portfolioId on the body is 400.',
  })
  @ApiParam({ name: 'id', type: Number })
  @ApiBody({ type: UpdateInstitutionalObjectiveDto })
  @ApiForbiddenResponse({ description: WRITE_FORBIDDEN })
  @Roles(SecRolesEnum.ODS_ADMIN, SecRolesEnum.SYSTEM_ADMIN)
  @UseGuards(HumanCredentialGuard)
  @UsePipes(frameworkPipe)
  updateObjective(
    @Param() params: ElementIdParamDto,
    @Body() dto: UpdateInstitutionalObjectiveDto,
  ) {
    return this.service.updateObjective(params.id, dto).then((data) =>
      ResponseUtils.format({
        description: 'Objective updated',
        data,
        status: HttpStatus.OK,
      }),
    );
  }

  // A10 delete
  @Delete('objectives/:id')
  @ApiOperation({
    summary: 'Delete an institutional objective nothing references',
  })
  @ApiParam({ name: 'id', type: Number })
  @ApiForbiddenResponse({ description: WRITE_FORBIDDEN })
  @Roles(SecRolesEnum.ODS_ADMIN, SecRolesEnum.SYSTEM_ADMIN)
  @UseGuards(HumanCredentialGuard)
  @UsePipes(frameworkPipe)
  deleteObjective(@Param() params: ElementIdParamDto) {
    return this.service.deleteObjective(params.id).then((data) =>
      ResponseUtils.format({
        description: 'Objective deleted',
        data,
        status: HttpStatus.OK,
      }),
    );
  }

  private async proposeElement(query: CodeProposalQueryDto) {
    const view = await this.read.getFramework(query.portfolioId);
    const parentId = query.parentId ?? null;
    if (
      parentId !== null &&
      !view.elements.some((element) => element.id === parentId)
    ) {
      throw new NotFoundException({
        message: { description: 'Parent not found', field: 'parentId' },
      });
    }
    const proposal = proposeElementCode(
      view.elements.map((element) => ({
        id: element.id,
        parentId: element.parentId,
        depth: element.depth,
        code: element.code,
      })),
      parentId,
    );
    if ('field' in proposal) {
      throw badRequest(proposal.field, proposal.description);
    }
    return { code: proposal.code };
  }

  private async proposeIob(query: CodeProposalQueryDto) {
    if (query.year === undefined) {
      throw badRequest('year', 'year is required');
    }
    const rows = await this.read.listObjectives(query.portfolioId, query.year);
    const proposal = proposeIobCode(rows.map((row) => row.code));
    if ('field' in proposal) {
      throw badRequest(proposal.field, proposal.description);
    }
    return { code: proposal.code };
  }
}
