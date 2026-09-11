// @akili-spec docs/specs/changes/my-pi-delegates — T-17/T-19/T-20
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
import { ListByDelegateDto } from './dto/list-by-delegate.query.dto';

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
  // POST /pi-delegates — per-project bulk sync (R-PID-011 / v4)
  // ─────────────────────────────────────────────────────────────────────────
  @Post()
  @ApiOperation({
    summary: 'Bulk-assign (per-project sync) PI delegates',
    description:
      'Synchronises the desired delegate set for each project independently (DD-L). ' +
      'Each assignment in the payload carries its own project_id and delegate list. ' +
      'For each project the active delegation set becomes EXACTLY its delegate list: ' +
      'pairs in the list but not active are CREATED; active pairs not in the list are REVOKED; ' +
      'pairs already active are KEPT. ' +
      'An empty delegates array for a project revokes ALL its active delegates (R-PID-011 AC.3). ' +
      'Every movement (create and revoke) writes a history row in the SAME transaction (R-PID-012). ' +
      'The whole operation runs in ONE transaction — any error rolls back all projects (R-PID-011 AC.4). ' +
      'Authorization per project (R-PID-007): caller must be PI, active delegate, or SYSTEM_ADMIN ' +
      'of every project_id — fail-fast, nothing applied on any 403. ' +
      'PI-exclusion (R-PID-008): if any (project, delegate) pair names a user who is the PI ' +
      'of that project the whole request is rejected. ' +
      'Delegates are provisioned once across all assignments and reused (R-PID-011 AC.4). ' +
      'Returns a per-project summary { project_id, created, revoked, kept }.',
  })
  @ApiBody({
    type: BulkAssignPiDelegatesDto,
    description:
      'Per-project sync payload: each assignment has its own project_id and delegate list (DD-L)',
    examples: {
      byUserId: {
        summary: 'Per-project — existing sec_users (delegate_user_id)',
        value: {
          assignments: [
            {
              project_id: 'INIT-268',
              delegates: [{ delegate_user_id: 42 }, { delegate_user_id: 55 }],
            },
            {
              project_id: 'INIT-269',
              delegates: [{ delegate_user_id: 42 }],
            },
          ],
        },
      },
      byIdentity: {
        summary: 'Per-project — new delegates to provision',
        value: {
          assignments: [
            {
              project_id: 'INIT-268',
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
          ],
        },
      },
      mixed: {
        summary: 'Per-project — mixed existing + new',
        value: {
          assignments: [
            {
              project_id: 'INIT-268',
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
          ],
        },
      },
      revokeAll: {
        summary:
          'Empty delegates list — revoke ALL active delegates for a project (R-PID-011 AC.3)',
        value: {
          assignments: [
            {
              project_id: 'INIT-268',
              delegates: [{ delegate_user_id: 42 }, { delegate_user_id: 55 }],
            },
            {
              project_id: 'INIT-269',
              delegates: [],
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
  // GET /pi-delegates/by-delegate — list active projects for a delegate
  //
  // Inverse of GET /pi-delegates?projectId (which lists delegates of a project).
  // Returns all active pi_delegates rows for the given delegate_user_id.
  //
  // Declared BEFORE @Delete() so Nest matches the static path segment
  // 'by-delegate' before the parameterless DELETE on the root path.
  //
  // Auth (own-or-admin): enforced in the service — no @Roles here.
  // @akili-spec docs/specs/changes/my-pi-delegates — active_delegate_key removal + by-delegate endpoint (2026-09-11)
  // ─────────────────────────────────────────────────────────────────────────
  @Get('by-delegate')
  @ApiOperation({
    summary: 'List active project assignments for a delegate',
    description:
      'Returns all active pi_delegates rows where delegate_user_id matches the given value. ' +
      'This is the inverse of GET /pi-delegates?projectId: instead of listing the delegates ' +
      'of a project, it lists the projects a delegate is assigned to. ' +
      'Authorization (own-or-admin): the caller may query their own delegate_user_id; ' +
      'a SYSTEM_ADMIN may query any delegate_user_id. All other combinations return 403.',
  })
  @ApiQuery({
    name: 'delegate_user_id',
    required: true,
    type: Number,
    description: 'sec_users.sec_user_id of the delegate to query',
  })
  @UsePipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  )
  async listByDelegate(@Query() dto: ListByDelegateDto) {
    return this.piDelegatesService
      .listByDelegate(dto.delegate_user_id)
      .then((data) =>
        ResponseUtils.format({
          data,
          description: 'Projects for the delegate',
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
