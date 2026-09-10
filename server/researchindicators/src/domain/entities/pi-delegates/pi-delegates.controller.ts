// @akili-spec docs/specs/changes/my-pi-delegates — T-13
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpStatus,
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
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { RolesGuard } from '../../shared/guards/roles.guard';
import { ResponseUtils } from '../../shared/utils/response.utils';
import { PiDelegatesService } from './pi-delegates.service';
import { BulkAssignPiDelegatesDto } from './dto/bulk-assign-pi-delegates.dto';
import { BulkRevokePiDelegatesDto } from './dto/bulk-revoke-pi-delegates.dto';
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
  // POST /pi-delegates — bulk sync (R-PID-009)
  // ─────────────────────────────────────────────────────────────────────────
  @Post()
  @ApiOperation({
    summary: 'Bulk-assign (sync) PI delegates to one or more projects',
    description:
      'Synchronises the desired delegate set into every project_id in the request ' +
      '(cartesian — DD-K). For each project the active delegation set becomes EXACTLY ' +
      'the delegates list: pairs in the list but not active are CREATED; active pairs ' +
      'not in the list are REVOKED; pairs already active are KEPT. ' +
      'The whole operation runs in ONE transaction — any error rolls back all projects (R-PID-009 AC.6). ' +
      'Authorization per project (R-PID-007): caller must be PI, active delegate, or SYSTEM_ADMIN ' +
      'of every project_id — fail-fast, nothing applied on any 403. ' +
      'PI-exclusion (R-PID-008): if any (project, delegate) pair names a user who is the PI ' +
      'of that project the whole request is rejected. ' +
      'Returns a per-project summary { project_id, created, revoked, kept }.',
  })
  @ApiBody({
    type: BulkAssignPiDelegatesDto,
    description: 'Bulk-sync payload: N delegates × M projects (cartesian)',
    examples: {
      byUserId: {
        summary: 'Existing sec_users (delegate_user_id)',
        value: {
          project_ids: ['INIT-268', 'INIT-269'],
          delegates: [{ delegate_user_id: 42 }, { delegate_user_id: 55 }],
        },
      },
      byIdentity: {
        summary: 'New delegates to provision',
        value: {
          project_ids: ['INIT-268'],
          delegates: [
            {
              delegate: {
                email: 'j.doe@cgiar.org',
                first_name: 'Jane',
                last_name: 'Doe',
              },
            },
          ],
        },
      },
      mixed: {
        summary: 'Mixed — existing + new',
        value: {
          project_ids: ['INIT-268'],
          delegates: [
            { delegate_user_id: 42 },
            {
              delegate: {
                email: 'j.smith@cgiar.org',
                first_name: 'John',
                last_name: 'Smith',
              },
              carnet: 'C012345',
            },
          ],
        },
      },
    },
  })
  @UsePipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  )
  async assign(@Body() dto: BulkAssignPiDelegatesDto) {
    return this.piDelegatesService.assign(dto).then((data) =>
      ResponseUtils.format({
        data,
        description: 'PI delegations synchronised',
        status: HttpStatus.OK,
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
  // MUST be declared ABOVE @Delete() so Nest matches the static path segment
  // 'verify' before the parameterless DELETE on the root path.
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
  // DELETE /pi-delegates — bulk targeted revoke (R-PID-010)
  //
  // No path parameter — target IDs come in the request body.
  // ─────────────────────────────────────────────────────────────────────────
  @Delete()
  @ApiOperation({
    summary: 'Bulk targeted revoke (soft-delete) of PI delegations',
    description:
      'Soft-deletes the specified active delegations. Does NOT synchronise — ' +
      'only the named delegations are affected; everything else is untouched (R-PID-010 AC.2). ' +
      'Accepts EXACTLY ONE of two shapes:\n\n' +
      '**Shape A** — `{ pi_delegate_ids: number[] }`: revoke by primary key.\n\n' +
      '**Shape B** — `{ project_ids: string[], delegate_user_ids: number[] }`: ' +
      'revoke every active (project_id, delegate_user_id) pair in the cartesian product.\n\n' +
      'Authorization per project (R-PID-007): the caller must be PI, active delegate, ' +
      'or SYSTEM_ADMIN of every project involved. ' +
      'All writes run in one transaction.',
  })
  @ApiBody({
    type: BulkRevokePiDelegatesDto,
    description:
      'Bulk-revoke payload. Provide EXACTLY ONE shape: Shape A (pi_delegate_ids) ' +
      'OR Shape B (project_ids + delegate_user_ids).',
    examples: {
      shapeA: {
        summary: 'Shape A — revoke by primary key',
        value: { pi_delegate_ids: [7, 12] },
      },
      shapeB: {
        summary: 'Shape B — revoke by project × delegate',
        value: {
          project_ids: ['INIT-268', 'INIT-269'],
          delegate_user_ids: [42, 55],
        },
      },
    },
  })
  @UsePipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  )
  async bulkRevoke(@Body() dto: BulkRevokePiDelegatesDto) {
    return this.piDelegatesService.bulkRevoke(dto).then((data) =>
      ResponseUtils.format({
        data,
        description: 'PI delegations revoked',
        status: HttpStatus.OK,
      }),
    );
  }
}
