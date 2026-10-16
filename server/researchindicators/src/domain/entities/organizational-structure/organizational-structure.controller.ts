import {
  Controller,
  Get,
  HttpStatus,
  Param,
  ParseIntPipe,
  Query,
  UseGuards,
  UseInterceptors,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { OrgStructureReadService } from './org-structure-read.service';
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
// T-01 holds the read half: B1, B2, B5. This controller declares no portfolio
// parameter anywhere (R-ORG-001 AC.1).
@Controller()
@ApiTags('Organizational Structure')
@ApiBearerAuth()
@UseInterceptors(SetUpInterceptor)
@UseGuards(RolesGuard)
export class OrganizationalStructureController {
  constructor(private readonly readService: OrgStructureReadService) {}

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
}
