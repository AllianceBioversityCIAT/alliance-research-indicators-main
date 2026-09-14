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
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import {
  ProjectDelegatesResponseDto,
  DelegateProjectsResponseDto,
} from './dto/pi-delegate-response.dto';
import { RolesGuard } from '../../shared/guards/roles.guard';
import { ResponseUtils } from '../../shared/utils/response.utils';
import { PiDelegatesService } from './pi-delegates.service';
import { BulkAssignPiDelegatesDto } from './dto/bulk-assign-pi-delegates.dto';
import { BulkRevokePiDelegatesDto } from './dto/bulk-revoke-pi-delegates.dto';
import { VerifyPiDelegateDto } from './dto/verify-pi-delegate.dto';
import { ListByDelegateDto } from './dto/list-by-delegate.query.dto';
import { ListManagedDto } from './dto/list-managed.query.dto';

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
    summary: 'List active PI delegations for a project (enriched)',
    description:
      'Returns a single project object with its active delegates. ' +
      'Project fields (project_code, project_name, is_pool_funding_contributor, ' +
      'status, start_date, end_date) come from agresso_contracts. ' +
      'Delegate identity (delegate_user_id, name, email) comes from sec_users. ' +
      'Caller must be the PI, an active delegate, or SYSTEM_ADMIN (R-PID-007).',
  })
  @ApiOkResponse({
    type: ProjectDelegatesResponseDto,
    description: 'Project with its active delegate list',
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
    summary: 'List active project assignments for a delegate (enriched)',
    description:
      'Returns a single person object with the active projects they are delegated for. ' +
      'Person fields (delegate_user_id, name, email) come from sec_users. ' +
      'Project fields (project_code, project_name) come from agresso_contracts. ' +
      'This is the inverse of GET /pi-delegates?projectId: instead of listing the delegates ' +
      'of a project, it lists the projects a delegate is assigned to. ' +
      'Authorization (own-or-admin): the caller may query their own delegate_user_id; ' +
      'a SYSTEM_ADMIN may query any delegate_user_id. All other combinations return 403.',
  })
  @ApiOkResponse({
    type: DelegateProjectsResponseDto,
    description: 'Delegate with their active project list',
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
  // GET /pi-delegates/by-user/projects — projects a user manages (PI or delegate)
  //
  // Returns the full enriched ProjectDelegatesResponseDto[] for every project
  // the specified user manages (as PI OR as an active delegate).
  // This is the "By project" tab data for the My PI Delegates UI when viewing
  // a whole user rather than a single project.
  //
  // Auth (own-or-admin): enforced in the service — no @Roles here.
  // Declared BEFORE @Delete() so Nest matches the static path segments
  // 'by-user/projects' before the parameterless DELETE on the root path.
  // @akili-spec docs/specs/changes/my-pi-delegates-ui — by-user endpoints
  // ─────────────────────────────────────────────────────────────────────────
  @Get('by-user/projects')
  @ApiOperation({
    summary:
      'List managed projects for a user (PI or active delegate), each enriched with delegates',
    description:
      'Returns an array of project objects — one per project the specified user manages ' +
      'either as PI or as an active delegate. ' +
      'Each project is enriched with its full active delegate list (same shape as ' +
      'GET /pi-delegates?projectId). ' +
      'Project fields (project_code, project_name, is_pool_funding_contributor, ' +
      'status, start_date, end_date) come from agresso_contracts. ' +
      'Delegate identity (delegate_user_id, name, email) comes from sec_users. ' +
      'Authorization (own-or-admin): the caller may query their own user_id; ' +
      'a SYSTEM_ADMIN may query any user_id. All other combinations return 403.',
  })
  @ApiOkResponse({
    type: ProjectDelegatesResponseDto,
    isArray: true,
    description:
      'Array of projects the user manages, each with its active delegate list',
  })
  @ApiQuery({
    name: 'user_id',
    required: true,
    type: Number,
    description:
      'sec_users.sec_user_id whose managed projects (PI or active delegate) to list',
  })
  @UsePipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  )
  async listManagedProjects(@Query() dto: ListManagedDto) {
    return this.piDelegatesService
      .listManagedProjects(dto.user_id)
      .then((data) =>
        ResponseUtils.format({
          data,
          description: 'Managed projects for the user',
          status: HttpStatus.OK,
        }),
      );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // GET /pi-delegates/by-user/people — distinct delegates across a user's managed projects
  //
  // Returns DelegateProjectsResponseDto[] — one entry per distinct delegate
  // across all projects the specified user manages. Each entry lists only the
  // managed-project assignments (projects the user does NOT manage are excluded).
  //
  // This is the "By person" tab data for the My PI Delegates UI when viewing
  // a whole user.
  //
  // Auth (own-or-admin): enforced in the service — no @Roles here.
  // Declared BEFORE @Delete() so Nest matches the static path segments
  // 'by-user/people' before the parameterless DELETE on the root path.
  // @akili-spec docs/specs/changes/my-pi-delegates-ui — by-user endpoints
  // ─────────────────────────────────────────────────────────────────────────
  @Get('by-user/people')
  @ApiOperation({
    summary:
      "List distinct delegates across a user's managed projects, each with their managed project assignments",
    description:
      'Returns an array of person objects — one per distinct delegate across all ' +
      'projects the specified user manages (as PI or as an active delegate). ' +
      "Each person object embeds only the projects within the user's managed set: " +
      'projects the user does NOT manage are excluded, even if the delegate is ' +
      'assigned to them. ' +
      'Person fields (delegate_user_id, name, email) come from sec_users. ' +
      'Project fields (project_code, project_name) come from agresso_contracts. ' +
      'Authorization (own-or-admin): the caller may query their own user_id; ' +
      'a SYSTEM_ADMIN may query any user_id. All other combinations return 403.',
  })
  @ApiOkResponse({
    type: DelegateProjectsResponseDto,
    isArray: true,
    description:
      'Array of distinct delegates, each with the managed projects they are assigned to',
  })
  @ApiQuery({
    name: 'user_id',
    required: true,
    type: Number,
    description: 'sec_users.sec_user_id whose managed delegates to list',
  })
  @UsePipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  )
  async listManagedDelegates(@Query() dto: ListManagedDto) {
    return this.piDelegatesService
      .listManagedDelegates(dto.user_id)
      .then((data) =>
        ResponseUtils.format({
          data,
          description: "Distinct delegates across the user's managed projects",
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
