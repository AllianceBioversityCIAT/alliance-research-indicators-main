// @akili-spec docs/specs/changes/my-pi-delegates — T-06
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpStatus,
  Param,
  ParseIntPipe,
  Post,
  Query,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { RolesGuard } from '../../shared/guards/roles.guard';
import { ResponseUtils } from '../../shared/utils/response.utils';
import { PiDelegatesService } from './pi-delegates.service';
import { CreatePiDelegateDto } from './dto/create-pi-delegate.dto';
import { VerifyPiDelegateDto } from './dto/verify-pi-delegate.dto';

// ⚠ No @Roles(...) is applied here (R-PID-007 / DD-B).
// RolesGuard.canActivate() returns true when no @Roles metadata is present,
// so any authenticated user reaches the handler.  Authorization is enforced
// inside PiDelegatesService.assertCanManageProject(), which throws 403 for
// callers who are not the PI, an active delegate, or a SYSTEM_ADMIN of the
// requested project.  Adding @Roles here would lock out legitimate
// PIs/delegates — a feature-breaking misuse.
@ApiTags('PI Delegates')
@ApiBearerAuth()
@UseGuards(RolesGuard)
@Controller()
export class PiDelegatesController {
  constructor(private readonly piDelegatesService: PiDelegatesService) {}

  // ─────────────────────────────────────────────────────────────────────────
  // POST /pi-delegates — create a delegation (R-PID-004, R-PID-005)
  // ─────────────────────────────────────────────────────────────────────────
  @Post()
  @ApiOperation({
    summary: 'Create a PI delegation for a project',
    description:
      'Provisions the delegate in sec_users if absent, then creates the ' +
      'pi_delegates row in a single transaction. Caller must be the PI, ' +
      'an active delegate, or a SYSTEM_ADMIN of the target project (R-PID-007).',
  })
  @ApiBody({ type: CreatePiDelegateDto })
  @UsePipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  )
  async create(@Body() dto: CreatePiDelegateDto) {
    return this.piDelegatesService.create(dto).then((data) =>
      ResponseUtils.format({
        data,
        description: 'PI delegation created',
        status: HttpStatus.CREATED,
      }),
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // GET /pi-delegates?projectId — list active delegations for a project
  // ─────────────────────────────────────────────────────────────────────────
  @Get()
  @ApiOperation({
    summary: 'List active PI delegations for a project',
    description:
      'Returns all active pi_delegates rows for the given projectId. ' +
      'Caller must be the PI, an active delegate, or SYSTEM_ADMIN (R-PID-007).',
  })
  @ApiQuery({
    name: 'projectId',
    required: true,
    type: String,
    description: 'Agresso agreement ID of the project (e.g. INIT-268)',
  })
  @UsePipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  )
  async list(@Query('projectId') projectId: string) {
    return this.piDelegatesService.list(projectId).then((data) =>
      ResponseUtils.format({
        data,
        description: 'PI delegations found',
        status: HttpStatus.OK,
      }),
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // GET /pi-delegates/verify — check if a delegation exists (R-PID-004)
  //
  // MUST be declared ABOVE @Delete(':pi_delegate_id') so Nest matches the
  // static path segment 'verify' before the dynamic param segment.
  // ─────────────────────────────────────────────────────────────────────────
  @Get('verify')
  @ApiOperation({
    summary: 'Verify whether an active delegation exists',
    description:
      'Returns { exists: boolean } for the given (project_id, delegate_user_id) pair. ' +
      'Caller must be the PI, an active delegate, or SYSTEM_ADMIN (R-PID-007).',
  })
  @ApiQuery({
    name: 'project_id',
    required: true,
    type: String,
    description: 'Agresso agreement ID of the project',
  })
  @ApiQuery({
    name: 'delegate_user_id',
    required: true,
    type: Number,
    description: 'sec_users.sec_user_id of the user to check',
  })
  @UsePipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  )
  async verify(@Query() dto: VerifyPiDelegateDto) {
    return this.piDelegatesService.verify(dto).then((data) =>
      ResponseUtils.format({
        data,
        description: 'PI delegation verification complete',
        status: HttpStatus.OK,
      }),
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // DELETE /pi-delegates/:pi_delegate_id — revoke a delegation (R-PID-004 AC.2)
  // ─────────────────────────────────────────────────────────────────────────
  @Delete(':pi_delegate_id')
  @ApiOperation({
    summary: 'Revoke (soft-delete) a PI delegation',
    description:
      'Sets is_active = false on the pi_delegates row. The delegate ' +
      'immediately loses PI capabilities. Caller must be the PI, an active ' +
      'delegate, or SYSTEM_ADMIN of the project (R-PID-007).',
  })
  @ApiParam({
    name: 'pi_delegate_id',
    type: Number,
    description: 'Primary key of the pi_delegates row to revoke',
    example: 7,
  })
  async revoke(@Param('pi_delegate_id', ParseIntPipe) piDelegateId: number) {
    return this.piDelegatesService.revoke(piDelegateId).then((data) =>
      ResponseUtils.format({
        data,
        description: 'PI delegation revoked',
        status: HttpStatus.OK,
      }),
    );
  }
}
